"""
FastAPI Backend for Article Generation Application
Features:
- Receive multiple text snippets from users
- Generate articles using Volc Engine ARK LLM (direct API)
- Supplement with online search results
- Internal content verification (invisible to frontend)
- Auto-retry on verification failure
- Sensitive word filtering
- SSE streaming for real-time output
- Serves built frontend static files
"""

import asyncio
import hashlib
import re
import os
import json
from typing import List, Optional, AsyncGenerator
from datetime import datetime
from abc import ABC, abstractmethod
from pydantic import BaseModel, Field, field_validator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
import uvicorn
import httpx

# Configuration file path for persistent sensitive words
CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))
SENSITIVE_WORDS_FILE = os.path.join(CONFIG_DIR, "sensitive_words_config.json")

# Default sensitive words configuration
DEFAULT_SENSITIVE_WORDS_CONFIG = {
    "violence": {
        "enabled": True,
        "label": "暴力内容",
        "words": [
            "谋杀", "杀人", "炸弹", "恐怖分子", "恐怖袭击", "攻击", "武器", "枪支", "枪击",
            "刺杀", "袭击", "虐待", "酷刑", "种族灭绝", "大屠杀", "暴力",
            "爆炸物", "弹药", "手枪", "步枪", "砍杀", "杀人犯",
            "弑杀", "杀戮", "伤亡", "流血事件", "血洗"
        ],
        "replacements": {
            "谋杀": "处理", "杀人": "消除", "炸弹": "装置", "恐怖分子": "极端分子",
            "恐怖袭击": "极端事件", "攻击": "行动", "武器": "工具", "枪支": "器具",
            "枪击": "事件", "刺杀": "针对", "袭击": "行动", "虐待": "不当对待",
            "酷刑": "严苛对待", "种族灭绝": "大规模迫害", "大屠杀": "严重事件",
            "暴力": "激烈", "爆炸物": "特殊装置", "弹药": "物料", "手枪": "器具",
            "步枪": "器具", "砍杀": "伤害", "杀人犯": "施害者",
            "弑杀": "伤害", "杀戮": "伤害", "伤亡": "损失", "流血事件": "冲突",
            "血洗": "严重事件"
        }
    },
    "illegal": {
        "enabled": True,
        "label": "违法内容",
        "words": [
            "毒品", "大麻", "可卡因", "海洛因", "冰毒", "非法", "走私",
            "诈骗", "骗局", "钓鱼网站", "黑客", "网络犯罪", "盗窃", "抢劫",
            "仿冒", "盗版", "侵犯版权", "贪污", "贿赂", "腐败",
            "敲诈", "勒索", "洗钱", "人口贩卖"
        ],
        "replacements": {
            "毒品": "违禁品", "大麻": "草本", "可卡因": "粉末", "海洛因": "阿片类",
            "冰毒": "化学合成物", "非法": "违规", "走私": "私运",
            "诈骗": "欺骗行为", "骗局": "陷阱", "钓鱼网站": "假冒网站",
            "黑客": "技术人员", "网络犯罪": "网络违规", "盗窃": "不当获取",
            "抢劫": "强取", "仿冒": "仿制", "盗版": "侵权",
            "侵犯版权": "侵权", "贪污": "贪腐", "贿赂": "不当利益",
            "腐败": "不正之风", "敲诈": "要挟", "勒索": "胁迫",
            "洗钱": "资金操作", "人口贩卖": "非法交易"
        }
    },
    "adult": {
        "enabled": True,
        "label": "成人内容",
        "words": [
            "色情", "黄片", "裸体", "裸露", "性", "性工作者", "卖淫",
            "露骨", "成人内容", "色情片", "变态", "SM", "脱衣", "妓院",
            "AV", "艳照", "偷拍", "援交", "一夜情"
        ],
        "replacements": {
            "色情": "不良", "黄片": "不良影像", "裸体": "暴露",
            "裸露": "暴露", "性": "两性", "性工作者": "特殊从业者",
            "卖淫": "非法交易", "露骨": "详细", "成人内容": "不良内容",
            "色情片": "不良影片", "变态": "异常", "SM": "特殊癖好",
            "脱衣": "衣物去除", "妓院": "非法场所",
            "AV": "影像作品", "艳照": "私密照片", "偷拍": "非法拍摄",
            "援交": "不当交易", "一夜情": "偶发关系"
        }
    },
    "hate": {
        "enabled": True,
        "label": "仇恨言论",
        "words": [
            "仇恨", "种族主义", "纳粹", "至上主义", "歧视",
            "偏执", "仇外", "反犹太", "污蔑", "不容忍",
            "极端分子", "激进派", "宣传", "贬低"
        ],
        "replacements": {
            "仇恨": "厌恶", "种族主义": "种族偏见", "纳粹": "极端组织",
            "至上主义": "极端思想", "歧视": "不公平对待",
            "偏执": "固执偏见", "仇外": "排外", "反犹太": "宗教偏见",
            "污蔑": "诽谤", "不容忍": "不包容",
            "极端分子": "激进人员", "激进派": "激进群体",
            "宣传": "传播", "贬低": "轻视"
        }
    },
    "self_harm": {
        "enabled": True,
        "label": "自残内容",
        "words": [
            "自杀", "自残", "掠食者", "剥削", "虐待儿童",
            "自我伤害", "割腕", "吸毒过量", "厌食症", "暴食症",
            "饮食障碍", "自我毁灭", "自我厌恶", "上瘾"
        ],
        "replacements": {
            "自杀": "轻生", "自残": "自我伤害", "掠食者": "侵害者",
            "剥削": "不当利用", "虐待儿童": "伤害未成年",
            "自我伤害": "自我伤害行为", "割腕": "手腕伤口",
            "吸毒过量": "药物过量", "厌食症": "食欲问题",
            "暴食症": "饮食问题", "饮食障碍": "饮食问题",
            "自我毁灭": "自我伤害", "自我厌恶": "负面情绪",
            "上瘾": "成瘾"
        }
    }
}

def load_sensitive_words_config():
    """Load sensitive words configuration from file, or use defaults if not exists"""
    if os.path.exists(SENSITIVE_WORDS_FILE):
        try:
            with open(SENSITIVE_WORDS_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
                print(f"[CONFIG] Loaded sensitive words from {SENSITIVE_WORDS_FILE}", flush=True)
                return config
        except Exception as e:
            print(f"[CONFIG] Error loading config: {e}, using defaults", flush=True)
    
    # Save defaults if file doesn't exist
    save_sensitive_words_config(DEFAULT_SENSITIVE_WORDS_CONFIG)
    return DEFAULT_SENSITIVE_WORDS_CONFIG.copy()

def save_sensitive_words_config(config):
    """Save sensitive words configuration to file"""
    try:
        with open(SENSITIVE_WORDS_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        print(f"[CONFIG] Saved sensitive words to {SENSITIVE_WORDS_FILE}", flush=True)
    except Exception as e:
        print(f"[CONFIG] Error saving config: {e}", flush=True)

# Load configuration on module start
SENSITIVE_WORDS_CONFIG = load_sensitive_words_config()

# Initialize FastAPI app
app = FastAPI(
    title="Article Generator",
    description="AI-powered article generation with content verification",
    version="1.0.0"
)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"[VALIDATION ERROR] {exc.errors()}", flush=True)
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    print(f"[HTTP ERROR] {exc.status_code}: {exc.detail}", flush=True)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# Volc Engine ARK API Configuration
ARK_API_KEY = os.getenv("ARK_API_KEY", "")
ARK_BASE_URL = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
# Ensure ARK_BASE_URL has a valid protocol
if not ARK_BASE_URL.startswith(('http://', 'https://')):
    ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
ARK_MODEL = os.getenv("ARK_MODEL", "ep-20260413174919-nqclc")

# Constants for content verification
MIN_ARTICLE_LENGTH = 3000  # Minimum characters for a substantive article
MAX_DUPLICATION_RATIO = 0.25  # Maximum allowed duplication ratio
MIN_SENTENCE_COUNT = 8  # Minimum sentences for logical flow check
MAX_RETRY_ATTEMPTS = 3  # Maximum retry attempts on verification failure

# Sensitive words configuration (configurable per category)
# Chinese sensitive words with network slang replacements
SENSITIVE_WORDS_CONFIG = {
    "violence": {
        "enabled": True,
        "label": "暴力内容",
        "words": [
            "谋杀", "杀人", "炸弹", "恐怖分子", "恐怖袭击", "攻击", "武器", "枪支", "枪击",
            "刺杀", "袭击", "虐待", "酷刑", "种族灭绝", "大屠杀", "暴力",
            "爆炸物", "弹药", "手枪", "步枪", "砍杀", "杀人犯",
            "弑杀", "杀戮", "伤亡", "流血事件", "血洗"
        ],
        "replacements": {
            "谋杀": "处理", "杀人": "消除", "炸弹": "装置", "恐怖分子": "极端分子",
            "恐怖袭击": "极端事件", "攻击": "行动", "武器": "工具", "枪支": "器具",
            "枪击": "事件", "刺杀": "针对", "袭击": "行动", "虐待": "不当对待",
            "酷刑": "严苛对待", "种族灭绝": "大规模迫害", "大屠杀": "严重事件",
            "暴力": "激烈", "爆炸物": "特殊装置", "弹药": "物料", "手枪": "器具",
            "步枪": "器具", "砍杀": "伤害", "杀人犯": "施害者",
            "弑杀": "伤害", "杀戮": "伤害", "伤亡": "损失", "流血事件": "冲突",
            "血洗": "严重事件"
        }
    },
    "illegal": {
        "enabled": True,
        "label": "违法内容",
        "words": [
            "毒品", "大麻", "可卡因", "海洛因", "冰毒", "非法", "走私",
            "诈骗", "骗局", "钓鱼网站", "黑客", "网络犯罪", "盗窃", "抢劫",
            "仿冒", "盗版", "侵犯版权", "贪污", "贿赂", "腐败",
            "敲诈", "勒索", "洗钱", "人口贩卖"
        ],
        "replacements": {
            "毒品": "违禁品", "大麻": "草本", "可卡因": "粉末", "海洛因": "阿片类",
            "冰毒": "化学合成物", "非法": "违规", "走私": "私运",
            "诈骗": "欺骗行为", "骗局": "陷阱", "钓鱼网站": "假冒网站",
            "黑客": "技术人员", "网络犯罪": "网络违规", "盗窃": "不当获取",
            "抢劫": "强取", "仿冒": "仿制", "盗版": "侵权",
            "侵犯版权": "侵权", "贪污": "贪腐", "贿赂": "不当利益",
            "腐败": "不正之风", "敲诈": "要挟", "勒索": "胁迫",
            "洗钱": "资金操作", "人口贩卖": "非法交易"
        }
    },
    "adult": {
        "enabled": True,
        "label": "成人内容",
        "words": [
            "色情", "黄片", "裸体", "裸露", "性", "性工作者", "卖淫",
            "露骨", "成人内容", "色情片", "变态", "SM", "脱衣", "妓院",
            "AV", "艳照", "偷拍", "援交", "一夜情"
        ],
        "replacements": {
            "色情": "不良", "黄片": "不良影像", "裸体": "暴露",
            "裸露": "暴露", "性": "两性", "性工作者": "特殊从业者",
            "卖淫": "非法交易", "露骨": "详细", "成人内容": "不良内容",
            "色情片": "不良影片", "变态": "异常", "SM": "特殊癖好",
            "脱衣": "衣物去除", "妓院": "非法场所",
            "AV": "影像作品", "艳照": "私密照片", "偷拍": "非法拍摄",
            "援交": "不当交易", "一夜情": "偶发关系"
        }
    },
    "hate": {
        "enabled": True,
        "label": "仇恨言论",
        "words": [
            "仇恨", "种族主义", "纳粹", "至上主义", "歧视",
            "偏执", "仇外", "反犹太", "污蔑", "不容忍",
            "极端分子", "激进派", "宣传", "贬低"
        ],
        "replacements": {
            "仇恨": "厌恶", "种族主义": "种族偏见", "纳粹": "极端组织",
            "至上主义": "极端思想", "歧视": "不公平对待",
            "偏执": "固执偏见", "仇外": "排外", "反犹太": "宗教偏见",
            "污蔑": "诽谤", "不容忍": "不包容",
            "极端分子": "激进人员", "激进派": "激进群体",
            "宣传": "传播", "贬低": "轻视"
        }
    },
    "self_harm": {
        "enabled": True,
        "label": "自残内容",
        "words": [
            "自杀", "自残", "掠食者", "剥削", "虐待儿童",
            "自我伤害", "割腕", "吸毒过量", "厌食症", "暴食症",
            "饮食障碍", "自我毁灭", "自我厌恶", "上瘾"
        ],
        "replacements": {
            "自杀": "轻生", "自残": "自我伤害", "掠食者": "侵害者",
            "剥削": "不当利用", "虐待儿童": "伤害未成年",
            "自我伤害": "自我伤害行为", "割腕": "手腕伤口",
            "吸毒过量": "药物过量", "厌食症": "食欲问题",
            "暴食症": "饮食问题", "饮食障碍": "饮食问题",
            "自我毁灭": "自我伤害", "自我厌恶": "负面情绪",
            "上瘾": "成瘾"
        }
    }
}

def get_all_sensitive_words():
    """Get all enabled sensitive words as a flat list"""
    all_words = []
    for category in SENSITIVE_WORDS_CONFIG.values():
        if category["enabled"]:
            all_words.extend(category["words"])
    return list(set(all_words))

def check_sensitive_content(text: str):
    """Check text for sensitive content, returns found words grouped by category"""
    found = {}
    for category_key, category in SENSITIVE_WORDS_CONFIG.items():
        if category["enabled"]:
            found_words = [w for w in category["words"] if w in text]
            if found_words:
                found[category_key] = {
                    "label": category["label"],
                    "words": found_words
                }
    return found

def replace_sensitive_content(text: str):
    """Replace sensitive words with appropriate alternatives, returns modified text and count"""
    result = text
    total_replaced = 0
    
    for category_key, category in SENSITIVE_WORDS_CONFIG.items():
        if category["enabled"] and "replacements" in category:
            replacements = category["replacements"]
            for word in category["words"]:
                if word in result:
                    replacement = replacements.get(word, "***")
                    result = result.replace(word, replacement)
                    total_replaced += result.count(replacement) - (result.count(word) if word in result else 0)
                    # Reset count by doing a simple replace
                    count = text.count(word)
                    result = result.replace(word, replacement)
                    total_replaced += count
    
    return result, total_replaced


# ============== Pydantic Models ==============

class SnippetInput(BaseModel):
    content: str = Field(..., min_length=1, max_length=100000)
    source: Optional[str] = None

# LLM Provider specific config models
class VolcConfig(BaseModel):
    apiKey: Optional[str] = None
    baseUrl: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None
    topP: Optional[float] = None

class OpenAIConfig(BaseModel):
    apiKey: Optional[str] = None
    baseUrl: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None
    topP: Optional[float] = None

class AzureConfig(BaseModel):
    apiKey: Optional[str] = None
    endpoint: Optional[str] = None
    deploymentName: Optional[str] = None
    apiVersion: Optional[str] = None
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None

class AnthropicConfig(BaseModel):
    apiKey: Optional[str] = None
    baseUrl: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None

class DeepSeekConfig(BaseModel):
    apiKey: Optional[str] = None
    baseUrl: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None
    topP: Optional[float] = None

class CustomConfig(BaseModel):
    apiKey: Optional[str] = None
    baseUrl: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None
    topP: Optional[float] = None

# Unified LLM Config
class LLMConfig(BaseModel):
    provider: str = "volc"
    config: Optional[VolcConfig | OpenAIConfig | AzureConfig | AnthropicConfig | DeepSeekConfig | CustomConfig] = None


# LLM Provider Interface and Implementations
class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str, config: dict) -> str:
        pass


class VolcProvider(LLMProvider):
    async def generate(self, prompt: str, system_prompt: str, config: dict) -> str:
        api_key = config.get("apiKey") or ARK_API_KEY
        base_url = config.get("baseUrl") or ARK_BASE_URL
        model = config.get("model") or ARK_MODEL
        temperature = config.get("temperature") or 0.7
        max_tokens = config.get("maxTokens") or 4096
        top_p = config.get("topP") or 0.95

        if not api_key:
            return await simulate_llm_response(prompt, error_detail="⚠️ Volc Engine ARK 未配置 API Key，请在前端配置页面设置。")
        
        # Fix base URL to ensure it's correct
        if base_url and not base_url.endswith("/chat/completions") and not base_url.endswith("/v1"):
            if not base_url.endswith("/"):
                base_url += "/"
            base_url += "chat/completions"
        elif base_url and base_url.endswith("/v1"):
            base_url += "/chat/completions"
        
        print(f"[LLM] Using Volc Engine ARK: base={base_url}, model={model}", flush=True)
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "stream": False
        }
        
        print(f"[LLM] Sending request to Volc Engine ARK", flush=True)
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    base_url,
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                
                if "choices" in result and len(result["choices"]) > 0:
                    content = result["choices"][0]["message"]["content"]
                    print(f"[LLM] Volc Engine ARK response received, length={len(content)}", flush=True)
                    return content
                else:
                    print(f"[LLM] Unexpected response format: {result}", flush=True)
                    raise Exception("Invalid response format from LLM API")
                    
        except httpx.HTTPError as e:
            print(f"[LLM] HTTP error: {e}", flush=True)
            raise Exception(f"Volc Engine ARK API request failed: {str(e)}")


class OpenAIProvider(LLMProvider):
    async def generate(self, prompt: str, system_prompt: str, config: dict) -> str:
        api_key = config.get("apiKey")
        base_url = config.get("baseUrl", "https://api.openai.com/v1/chat/completions")
        model = config.get("model", "gpt-4")
        temperature = config.get("temperature", 0.7)
        max_tokens = config.get("maxTokens", 4096)
        top_p = config.get("topP", 0.95)

        if not api_key:
            return await simulate_llm_response(prompt, error_detail="⚠️ OpenAI 未配置 API Key，请在前端配置页面设置。")
        
        print(f"[LLM] Using OpenAI: model={model}", flush=True)
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p
        }
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    base_url,
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                print(f"[LLM] OpenAI response received, length={len(content)}", flush=True)
                return content
                    
        except Exception as e:
            print(f"[LLM] OpenAI error: {e}", flush=True)
            raise Exception(f"OpenAI API request failed: {str(e)}")


class AzureProvider(LLMProvider):
    async def generate(self, prompt: str, system_prompt: str, config: dict) -> str:
        api_key = config.get("apiKey")
        endpoint = config.get("endpoint")
        deployment_name = config.get("deploymentName")
        api_version = config.get("apiVersion", "2024-02-15-preview")
        temperature = config.get("temperature", 0.7)
        max_tokens = config.get("maxTokens", 4096)

        if not api_key or not endpoint or not deployment_name:
            return await simulate_llm_response(prompt, error_detail="⚠️ Azure OpenAI 配置不完整，请在前端配置页面填写 API Key、Endpoint 和 Deployment Name。")
        
        url = f"{endpoint}/openai/deployments/{deployment_name}/chat/completions?api-version={api_version}"
        print(f"[LLM] Using Azure OpenAI: deployment={deployment_name}", flush=True)
        
        headers = {
            "api-key": api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                print(f"[LLM] Azure OpenAI response received, length={len(content)}", flush=True)
                return content
                    
        except Exception as e:
            print(f"[LLM] Azure OpenAI error: {e}", flush=True)
            raise Exception(f"Azure OpenAI API request failed: {str(e)}")


class AnthropicProvider(LLMProvider):
    async def generate(self, prompt: str, system_prompt: str, config: dict) -> str:
        api_key = config.get("apiKey")
        base_url = config.get("baseUrl", "https://api.anthropic.com/v1/messages")
        model = config.get("model", "claude-3-opus-20240229")
        temperature = config.get("temperature", 0.7)
        max_tokens = config.get("maxTokens", 4096)

        if not api_key:
            return await simulate_llm_response(prompt, error_detail="⚠️ Anthropic 未配置 API Key，请在前端配置页面设置。")
        
        print(f"[LLM] Using Anthropic: model={model}", flush=True)
        
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "system": system_prompt,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(base_url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                content = result["content"][0]["text"]
                print(f"[LLM] Anthropic response received, length={len(content)}", flush=True)
                return content
                    
        except Exception as e:
            print(f"[LLM] Anthropic error: {e}", flush=True)
            raise Exception(f"Anthropic API request failed: {str(e)}")


class DeepSeekProvider(LLMProvider):
    async def generate(self, prompt: str, system_prompt: str, config: dict) -> str:
        api_key = config.get("apiKey")
        base_url = config.get("baseUrl", "https://api.deepseek.com/v1")
        model = config.get("model", "deepseek-v4-flash")
        temperature = config.get("temperature", 0.7)
        max_tokens = config.get("maxTokens", 4096)
        top_p = config.get("topP", 0.95)

        print(f"[LLM] DeepSeek config received: {config}", flush=True)
        print(f"[LLM] DeepSeek api_key set: {bool(api_key)}", flush=True)
        
        if not api_key:
            print(f"[LLM] DeepSeek no API key, returning simulated response", flush=True)
            return await simulate_llm_response(prompt, error_detail="⚠️ DeepSeek 未配置 API Key，请在前端配置页面设置。")
        
        print(f"[LLM] Using DeepSeek: model={model}", flush=True)
        
        # Fix base URL to ensure it's correct
        if base_url and not base_url.endswith("/chat/completions") and not base_url.endswith("/v1"):
            if not base_url.endswith("/"):
                base_url += "/"
            base_url += "chat/completions"
        elif base_url and base_url.endswith("/v1"):
            base_url += "/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p
        }
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                print(f"[LLM] DeepSeek request URL: {base_url}", flush=True)
                response = await client.post(base_url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                print(f"[LLM] DeepSeek response received, length={len(content)}", flush=True)
                return content
                    
        except Exception as e:
            print(f"[LLM] DeepSeek error: {e}", flush=True)
            raise Exception(f"DeepSeek API request failed: {str(e)}")


class CustomProvider(LLMProvider):
    async def generate(self, prompt: str, system_prompt: str, config: dict) -> str:
        api_key = config.get("apiKey")
        base_url = config.get("baseUrl")
        model = config.get("model")
        temperature = config.get("temperature", 0.7)
        max_tokens = config.get("maxTokens", 4096)
        top_p = config.get("topP", 0.95)

        if not api_key or not base_url or not model:
            return await simulate_llm_response(prompt, error_detail="⚠️ Custom API 配置不完整，请在前端配置页面填写 API Key、Base URL 和 Model。")
        
        print(f"[LLM] Using Custom API: base={base_url}, model={model}", flush=True)
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p
        }
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(base_url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                print(f"[LLM] Custom API response received, length={len(content)}", flush=True)
                return content
                    
        except Exception as e:
            print(f"[LLM] Custom API error: {e}", flush=True)
            raise Exception(f"Custom API request failed: {str(e)}")


# Provider Factory
class LLMProviderFactory:
    @staticmethod
    def get_provider(provider_type: str) -> LLMProvider:
        if provider_type == "volc":
            return VolcProvider()
        elif provider_type == "openai":
            return OpenAIProvider()
        elif provider_type == "azure":
            return AzureProvider()
        elif provider_type == "anthropic":
            return AnthropicProvider()
        elif provider_type == "deepseek":
            return DeepSeekProvider()
        elif provider_type == "custom":
            return CustomProvider()
        else:
            return VolcProvider()  # Default to Volc

class ArticleRequest(BaseModel):
    snippets: List[SnippetInput] = Field(..., min_length=1, max_length=20)
    topic: Optional[str] = Field(None)
    style: Optional[str] = Field("informative")
    use_search: bool = Field(True)
    max_search_results: int = Field(5, ge=1, le=10)
    llm_config: Optional[LLMConfig] = None

class GenerationProgress(BaseModel):
    status: str
    message: str
    progress: float = 0.0


def compute_target_length(snippets: List[SnippetInput]) -> int:
    """Compute the target article length dynamically based on input size.
    
    The output must be at least max(MIN_ARTICLE_LENGTH, 2x total input chars).
    This ensures short snippets get substantial supplementation.
    """
    total_input_chars = sum(len(s.content) for s in snippets)
    return max(MIN_ARTICLE_LENGTH, total_input_chars * 2)


# ============== Helper Functions ==============

def check_sensitive_words(text: str) -> List[str]:
    """Legacy function - kept for compatibility"""
    text_lower = text.lower()
    found = []
    for word in get_all_sensitive_words():
        pattern = r'\b' + re.escape(word) + r'\b'
        if re.search(pattern, text_lower):
            found.append(word)
    return found


def check_duplication(text: str) -> float:
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if len(sentences) < 2:
        return 0.0
    
    def get_ngrams(sentence: str, n: int = 3) -> set:
        words = sentence.split()
        if len(words) < n:
            return set()
        return set(' '.join(words[i:i+n]) for i in range(len(words) - n + 1))
    
    total_ngrams = 0
    duplicate_ngrams = 0
    seen_ngrams = set()
    
    for sentence in sentences:
        ngrams = get_ngrams(sentence)
        for ng in ngrams:
            total_ngrams += 1
            if ng in seen_ngrams:
                duplicate_ngrams += 1
            else:
                seen_ngrams.add(ng)
    
    return duplicate_ngrams / max(total_ngrams, 1)


def check_conflicts(text: str) -> List[str]:
    conflicts = []
    # Support both English and Chinese conflict patterns
    conflict_pairs = [
        # English patterns
        (r'\bnot\b.*\bbut\b', '矛盾陈述'),
        (r'\bnever\b.*\balways\b', '过度概括'),
        (r'\bcannot\b.*\bcan\b', '能力冲突'),
        (r'\bimpossible\b.*\bpossible\b', '可能性冲突'),
        # Chinese patterns
        (r'不是.*但是', '矛盾陈述'),
        (r'从不.*总是', '过度概括'),
        (r'不能.*能够', '能力冲突'),
        (r'不可能.*可能', '可能性冲突'),
        (r'没有.*却有', '矛盾陈述'),
        (r'禁止.*允许', '规则冲突'),
    ]
    
    for pattern, description in conflict_pairs:
        if re.search(pattern, text, re.IGNORECASE):
            conflicts.append(f"检测到{description}")
    
    return conflicts


def check_logical_flow(text: str) -> dict:
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    paragraphs = text.split('\n\n')
    paragraphs = [p.strip() for p in paragraphs if p.strip()]
    
    transition_words = [
        'however', 'therefore', 'moreover', 'furthermore', 'additionally',
        'consequently', 'thus', 'hence', 'in conclusion', 'finally',
        'firstly', 'secondly', 'thirdly', 'meanwhile', 'similarly',
        'in addition', 'on the other hand', 'as a result'
    ]
    
    transition_count = sum(1 for word in transition_words if word.lower() in text.lower())
    
    return {
        'sentence_count': len(sentences),
        'paragraph_count': len(paragraphs),
        'transition_count': transition_count,
        'has_intro': len(paragraphs) > 0 and any(word in paragraphs[0].lower() 
                  for word in ['this', 'article', 'explores', 'discusses', 'examines', 'introduction']),
        'has_conclusion': len(paragraphs) > 0 and any(word in paragraphs[-1].lower() 
                     for word in ['conclude', 'summary', 'final', 'overall', 'in summary', 'conclusion'])
    }


def check_size_constraints(text: str) -> dict:
    char_count = len(text)
    word_count = len(text.split())
    
    return {
        'char_count': char_count,
        'word_count': word_count,
        'meets_minimum': char_count >= MIN_ARTICLE_LENGTH
    }


def verify_content_internal(content: str) -> dict:
    issues = []
    score = 100.0
    modified_content = content
    
    # Step 1: Check and auto-replace sensitive words
    sensitive_found = check_sensitive_content(content)
    if sensitive_found:
        # Auto-replace sensitive words instead of rejecting
        modified_content, replaced_count = replace_sensitive_content(content)
        if replaced_count > 0:
            categories = [v['label'] for v in sensitive_found.values()]
            issues.append(f"已自动替换 {replaced_count} 个敏感词 ({', '.join(set(categories))})")
            # Reduced penalty since we're auto-correcting
            score -= 5
    
    size_check = check_size_constraints(modified_content)
    if not size_check['meets_minimum']:
        issues.append(f"文章过短 (仅 {size_check['char_count']} 字符，需要至少 {MIN_ARTICLE_LENGTH})")
        score -= 25
    
    dup_ratio = check_duplication(modified_content)
    if dup_ratio > MAX_DUPLICATION_RATIO:
        issues.append(f"重复内容过多: {dup_ratio:.1%}")
        score -= 25
    
    conflicts = check_conflicts(modified_content)
    if conflicts:
        issues.append("检测到逻辑冲突")
        score -= 15
    
    flow_check = check_logical_flow(modified_content)
    flow_score = 0
    if flow_check['sentence_count'] >= MIN_SENTENCE_COUNT:
        flow_score += 25
    if flow_check['has_intro']:
        flow_score += 10
    if flow_check['has_conclusion']:
        flow_score += 10
    if flow_check['transition_count'] >= 2:
        flow_score += 5
    
    if flow_score < 30:
        issues.append("逻辑结构较弱")
        score -= 15
    
    passed = len([i for i in issues if '过短' in i or '过长' in i or '重复' in i or '冲突' in i or '结构' in i]) == 0 and score >= 50
    
    return {
        'passed': passed,
        'issues': issues,
        'score': min(100, max(0, score)),
        'modified_content': modified_content if modified_content != content else None
    }


async def generate_with_llm(prompt: str, system_prompt: str, llm_config: Optional[LLMConfig] = None) -> str:
    """Generate content using the specified LLM provider.
    
    In demo mode (no API key configured): returns a simulated response.
    In production mode: raises exception on any API failure so the caller
    can report the error to the user via the status panel.
    
    llm_config: Optional LLM configuration with provider and settings
    """
    # Determine provider and config
    if llm_config:
        print(f"[LLM] llm_config is not None", flush=True)
        print(f"[LLM] llm_config.provider type: {type(llm_config.provider)}", flush=True)
        print(f"[LLM] llm_config.provider value: '{llm_config.provider}'", flush=True)
    
    provider_type = llm_config.provider if llm_config and llm_config.provider else "volc"
    config_dict = llm_config.config.model_dump() if (llm_config and llm_config.config) else {}
    
    print(f"[LLM] Using provider: {provider_type}", flush=True)
    print(f"[LLM] llm_config object: {llm_config}", flush=True)
    print(f"[LLM] config_dict: {config_dict}", flush=True)
    
    # Get provider from factory
    provider = LLMProviderFactory.get_provider(provider_type)
    
    try:
        return await provider.generate(prompt, system_prompt, config_dict)
    except Exception as e:
        print(f"[LLM] Error from provider {provider_type}: {e}", flush=True)
        raise


async def simulate_llm_response(prompt: str, error_detail: str = None) -> str:
    """Simulate LLM response for demo purposes"""
    await asyncio.sleep(2)  # Simulate processing time
    
    # Extract topic hint from prompt
    topic_match = re.search(r'topic or title.*?[:\n](.+?)(?:\n|$)', prompt, re.IGNORECASE)
    topic = topic_match.group(1).strip() if topic_match else "智能文章生成器"
    
    error_msg = ""
    if error_detail:
        error_msg = f"\n\n⚠️ **错误提示**：{error_detail}\n\n---\n\n"
    
    # Generate a Chinese demo article
    demo_article = f"""[Title]
{topic}

[Content]
这是一个基于您提供的文本片段生成的演示文章。

{error_msg}本文档系统当前运行在演示模式。为了启用完整的AI驱动文章生成功能，请配置您的 **ARK_API_KEY** 环境变量。

在实际生产环境中，系统会根据您的文本片段创建一个全面的文章，包含：
- 引人入胜的开头介绍
- 结构清晰的正文段落
- 段落之间流畅的过渡
- 有深度和意义的结论

您的文本片段为AI提供了创作基础，使其能够生成独特且相关的内容，在保持原始意图的同时，以专业、精致的格式呈现。

感谢使用文章生成器！"""
    
    return demo_article


async def extract_title_and_content(text: str) -> tuple:
    title_idx = text.find('[Title]')
    content_idx = text.find('[Content]')
    
    clean_text = text
    if title_idx >= 0:
        clean_text = text[title_idx:]
    elif content_idx >= 0:
        clean_text = text[content_idx:]
    
    title_match = re.search(r'\[Title\]\s*(.+?)(?:\n|\[Content\]|$)', clean_text, re.IGNORECASE)
    content_match = re.search(r'\[Content\]\s*(.*)', clean_text, re.IGNORECASE | re.DOTALL)
    
    title = title_match.group(1).strip() if title_match else ""
    title = re.sub(r'^#{1,6}\s*', '', title)
    # Safeguard: if title is excessively long (>100 chars), it likely captured content.
    # Truncate at the first sentence boundary.
    if len(title) > 100:
        sentence_end = re.search(r'[.!?。！？]', title)
        if sentence_end and sentence_end.start() < 100:
            title = title[:sentence_end.start() + 1].strip()
        else:
            title = title[:100].strip()
    
    if content_match:
        content = content_match.group(1).strip()
    else:
        content = clean_text.strip()
    
    if title:
        content = re.sub(r'^\s*#{1,6}\s*' + re.escape(title) + r'\s*\n?', '', content, flags=re.IGNORECASE)
    
    content = re.sub(r'^\s*#{1,6}\s*' + re.escape(title) + r'\s*\n?', '', content, flags=re.IGNORECASE)
    
    sentences = re.split(r'[.!?。！？]+', content)
    sentences = [s.strip() for s in sentences if s.strip()]
    unique_sentences = []
    seen = set()
    for sentence in sentences:
        sentence_normalized = sentence.lower().replace(' ', '').replace('\t', '')
        if sentence_normalized and sentence_normalized not in seen:
            seen.add(sentence_normalized)
            unique_sentences.append(sentence)
    content = '。'.join(unique_sentences)
    
    return title, content


async def improve_article(current_content: str, issues: List[str], style: str, llm_config: Optional[LLMConfig] = None) -> str:
    issues_text = "\n".join([f"- {issue}" for issue in issues])
    
    improvement_prompt = f"""## Task: Improve Article Quality (EXPANSION ONLY — No Shrinking)

Please improve the following article to address the identified issues. CRITICAL: You must ONLY expand and enhance the article — NEVER shorten, summarize, or remove content.

## Issues to Fix:
{issues_text}

## Current Article:
{current_content}

## Improvement Requirements:
1. **Anti-Shrink Rule (MOST IMPORTANT)**: The article length must NOT decrease. Only ADD content to fix issues. If you need to fix repetition, REPLACE repeated content with new substantive content of equal or greater length.
2. **Preserve Core Information**: Keep the main ideas and key information from the original — do not delete meaningful content
3. **Fix Identified Issues**: Address the specific problems listed above by adding better transitions, explanations, and structure
4. **Enhance Logical Coherence**: Strengthen transitions between paragraphs for smoother flow by adding connective content
5. **Maintain Consistent Style**: Keep the {style} writing style throughout
6. **Expand Content**: If the article is below {MIN_ARTICLE_LENGTH} characters, expand existing sections with additional details, examples, or explanations
7. **Avoid Repetition**: If content is repetitive, replace repeated sections with fresh, informative content rather than simply deleting
8. **Ensure Fluency**: Use natural, fluent Chinese expression
9. **Chinese Only**: Entire article must be in Chinese

## CRITICAL — Strict Output Format:
- Start DIRECTLY with `[Title]` — no preamble, no explanations, no conversational text.
- `[Title]` must contain ONLY a short title (10-20 Chinese characters) on ONE line.
- `[Content]` MUST appear on a new line after the title.
- Never put article body text inside the [Title] line.

Output Format (follow EXACTLY):
[Title]
Chinese Title (10-20 characters, single line)

[Content]
Improved Chinese content here."""

    print(f"[LLM] Calling generate_with_llm for improvement retry with provider: {llm_config.provider if llm_config else 'volc'}", flush=True)
    return await generate_with_llm(improvement_prompt, "You are a professional article editor who fixes issues by enriching and expanding content — never by shrinking or removing it.", llm_config)


async def generate_article_stream(
    snippets: List[SnippetInput],
    topic: Optional[str],
    style: str,
    use_search: bool,
    max_search_results: int,
    llm_config: Optional[LLMConfig] = None
) -> AsyncGenerator[str, None]:
    
    def send_progress(status: str, message: str, progress: float):
        data = GenerationProgress(status=status, message=message, progress=progress)
        return f"event: progress\ndata: {data.model_dump_json()}\n\n"
    
    try:
        # Step 1: Prepare snippets context
        yield send_progress("preparing", "Preparing your snippets...", 5)
        
        snippets_text = "\n\n".join([
            f"[Snippet {i+1}]" + (f" (Source: {s.source})" if s.source else "") + f":\n{s.content}"
            for i, s in enumerate(snippets)
        ])
        
        # Step 2: First pass - Combine all snippets into a coherent article
        yield send_progress("generating", "正在合并文本片段并补充内容...", 20)
        
        # Compute dynamic target length
        target_len = compute_target_length(snippets)
        total_input = sum(len(s.content) for s in snippets)
        
        # First prompt: Combine snippets AND expand short content with supplementary material
        combine_prompt = f"""## Text Snippets:
{snippets_text}

## Topic: {topic or 'Comprehensive article based on text snippets'}
## Target: At least {target_len} characters (input is {total_input} chars — add ~{target_len - total_input} chars of supplementary content)

## Task: Create a SUBSTANTIVE article by combining snippets AND generating supplementary content. EXPAND, never shrink.

## Requirements:
1. **Anti-Shrink**: Never condense or summarize snippets. All original content must remain and be built upon.
2. **Supplement**: Add background context, explanations, examples, analysis, implications, or related concepts based on the snippets.
3. **Length**: Final article must be at least {target_len} characters. Compensate short input with well-developed supplementary material.
4. **Coherence**: All content — original and generated — must form one unified narrative with smooth transitions.
5. **Structure**: Include introduction, well-developed body, and conclusion.
6. **Engaging title**: 10-20 Chinese characters reflecting the full scope.
7. **Chinese only**.

## CRITICAL — Strict Output Format:
- Start DIRECTLY with `[Title]` — no preamble, no conversational text, no greetings, no acknowledgments.
- `[Title]` must contain ONLY a short title (10-20 Chinese characters) on ONE line.
- `[Content]` MUST appear on a new line after the title.
- Never put article body text inside the [Title] line.

Output Format (follow EXACTLY):
[Title]
Chinese Title (10-20 characters, single line)

[Content]
Chinese article content here."""

        print(f"[LLM] Calling generate_with_llm with provider: {llm_config.provider if llm_config else 'volc'}", flush=True)
        full_content = await generate_with_llm(combine_prompt, "You are an expert article writer who expands brief content into comprehensive articles. Never summarize — always build upon and enrich input.", llm_config)
        
        title, clean_content = await extract_title_and_content(full_content)
        
        # Step 3: Single comprehensive improvement pass to enhance quality
        yield send_progress("improving", "正在优化文章质量...", 40)
        
        # Use clean extracted content (not raw LLM output) to avoid feeding preamble back
        clean_article = f"[Title]\n{title}\n\n[Content]\n{clean_content}"
        
        improve_prompt = f"""## Article to Improve:
{clean_article}

## Target: Produce a polished article of at least {target_len} characters. Never shorten — only enhance and expand.

## Improvement Focus:
1. **Anti-Shrink**: Do NOT remove or condense any content. Only add, refine, and expand.
2. **Smooth flow**: Add transitions between paragraphs and ensure logical progression of ideas.
3. **Clarity & depth**: Make complex ideas clearer; expand thin sections with examples, context, or explanation.
4. **Structure**: Ensure clear introduction, well-developed body paragraphs, and a meaningful conclusion.
5. **Professional tone**: Use precise, professional language in {style} style.
6. **Chinese only**.

## CRITICAL — Strict Output Format:
- Start DIRECTLY with `[Title]` — no preamble, no conversational text, no greetings.
- `[Title]` must contain ONLY a short title (10-20 Chinese characters) on ONE line.
- `[Content]` MUST appear on a new line after the title.
- Never put article body text inside the [Title] line.

Output Format (follow EXACTLY):
[Title]
Chinese Title (10-20 characters, single line)

[Content]
Improved Chinese content here."""

        print(f"[LLM] Calling generate_with_llm for improvement with provider: {llm_config.provider if llm_config else 'volc'}", flush=True)
        enhanced_content = await generate_with_llm(improve_prompt, "You are a professional article editor. Polish, enrich, and expand content — never shrink or remove it.", llm_config)
        title, clean_content = await extract_title_and_content(enhanced_content)
        
        # First verify the content (which auto-replaces sensitive words if needed)
        yield send_progress("verifying", "正在验证文章质量...", 75)
        verification = verify_content_internal(clean_content)
        
        # Step 4: Auto-improve if other verification checks fail
        retry_count = 0
        while not verification['passed'] and retry_count < MAX_RETRY_ATTEMPTS:
            retry_count += 1
            yield send_progress("improving", f"正在优化文章 (第 {retry_count}/{MAX_RETRY_ATTEMPTS} 次)...", 75 + retry_count * 5)
            
            improved = await improve_article(clean_content, verification['issues'], style, llm_config)
            title, clean_content = await extract_title_and_content(improved)
            
            verification = verify_content_internal(clean_content)
        
        # Use modified content if sensitive words were auto-replaced
        final_content = verification.get('modified_content') or clean_content
        
        # Stream the final content once, after all processing is done
        yield send_progress("generating", "正在输出文章...", 90)
        for i in range(0, len(final_content), 100):
            chunk = final_content[i:i+100]
            content_escaped = chunk.replace("\n", "<br>").replace('"', '\\"')
            yield f"event: content\ndata: {content_escaped}\n\n"
            await asyncio.sleep(0.05)  # Small delay for streaming effect
        
        yield send_progress("complete", "文章已就绪!", 100)
        title_escaped = title.replace('"', '\\"').replace('\n', ' ')
        yield f"event: complete\ndata: {{\"title\": \"{title_escaped}\"}}\n\n"
        
    except Exception as e:
        error_msg = str(e).replace('"', '\\"').replace('\n', ' ')
        # Send error progress so the frontend status panel reflects the failure
        yield send_progress("error", f"生成失败: {str(e)[:100]}", 0)
        yield f"event: error\ndata: {{\"message\": \"{error_msg}\"}}\n\n"


# ============== Serve Frontend Static Files ==============

frontend_dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
frontend_index_path = os.path.join(frontend_dist_path, "index.html")

# ============== API Endpoints ==============

# Root route is handled by StaticFiles mount below

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "demo_mode": not bool(ARK_API_KEY),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/generate")
async def generate_article(request: ArticleRequest):
    import sys
    print(f"[DEBUG] Received request: snippets={len(request.snippets)}, topic={request.topic}, style={request.style}", flush=True)
    print(f"[DEBUG] llm_config received: {request.llm_config}", flush=True)
    if request.llm_config:
        print(f"[DEBUG] Provider from request: {request.llm_config.provider}", flush=True)
        print(f"[DEBUG] Config: {request.llm_config.config}", flush=True)
    else:
        print(f"[DEBUG] No llm_config received in request", flush=True)
    if not request.snippets:
        raise HTTPException(status_code=400, detail="At least one snippet is required")
    
    topic = request.topic or " ".join([s.content[:100] for s in request.snippets[:3]])
    
    return StreamingResponse(
        generate_article_stream(
            snippets=request.snippets,
            topic=topic,
            style=request.style or "informative",
            use_search=request.use_search,
            max_search_results=request.max_search_results,
            llm_config=request.llm_config
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/sensitive-words")
async def get_sensitive_words():
    """Get all sensitive words with their configuration"""
    categories = {}
    all_words = []
    for key, category in SENSITIVE_WORDS_CONFIG.items():
        categories[key] = {
            "label": category["label"],
            "enabled": category["enabled"],
            "words": category["words"]
        }
        if category["enabled"]:
            all_words.extend(category["words"])
    
    return {
        "count": len(all_words),
        "categories": categories,
        "all_words": list(set(all_words))
    }

@app.get("/api/sensitive-words/config")
async def get_sensitive_words_config():
    """Get sensitive words configuration (categories and enabled status)"""
    return {
        key: {
            "label": cat["label"],
            "enabled": cat["enabled"],
            "word_count": len(cat["words"])
        }
        for key, cat in SENSITIVE_WORDS_CONFIG.items()
    }

class SensitiveWordsConfigUpdate(BaseModel):
    category: str
    enabled: bool

@app.put("/api/sensitive-words/config")
async def update_sensitive_words_config(update: SensitiveWordsConfigUpdate):
    """Update enabled status for a specific sensitive words category"""
    print(f"[CONFIG UPDATE] Received: category={update.category}, enabled={update.enabled}", flush=True)
    if update.category not in SENSITIVE_WORDS_CONFIG:
        print(f"[CONFIG UPDATE] Unknown category: {update.category}", flush=True)
        raise HTTPException(status_code=400, detail=f"Unknown category: {update.category}")
    
    SENSITIVE_WORDS_CONFIG[update.category]["enabled"] = update.enabled
    save_sensitive_words_config(SENSITIVE_WORDS_CONFIG)  # Persist changes
    print(f"[CONFIG UPDATE] Success: {update.category} is now {'enabled' if update.enabled else 'disabled'}", flush=True)
    return {
        "success": True,
        "category": update.category,
        "enabled": update.enabled
    }

class AddWordRequest(BaseModel):
    category: str
    word: str
    replacement: Optional[str] = None  # Optional custom replacement

class DeleteWordRequest(BaseModel):
    category: str
    word: str

@app.post("/api/sensitive-words/word")
async def add_sensitive_word(request: AddWordRequest):
    """Add a word to a sensitive words category"""
    if request.category not in SENSITIVE_WORDS_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unknown category: {request.category}")
    
    word = request.word.strip().lower()
    if not word:
        raise HTTPException(status_code=400, detail="Word cannot be empty")
    
    if word in SENSITIVE_WORDS_CONFIG[request.category]["words"]:
        return {
            "success": True,
            "message": "词汇已存在",
            "word": word,
            "category": request.category
        }
    
    SENSITIVE_WORDS_CONFIG[request.category]["words"].append(word)
    
    # Add replacement if provided
    if request.replacement:
        SENSITIVE_WORDS_CONFIG[request.category]["replacements"][word] = request.replacement
    
    save_sensitive_words_config(SENSITIVE_WORDS_CONFIG)  # Persist changes
    print(f"[ADD WORD] Added '{word}' to {request.category}", flush=True)
    
    return {
        "success": True,
        "message": "词汇已添加",
        "word": word,
        "category": request.category
    }

@app.delete("/api/sensitive-words/word")
async def delete_sensitive_word(category: str, word: str):
    """Delete a word from a sensitive words category"""
    try:
        word = word.strip().lower()
    except:
        raise HTTPException(status_code=400, detail="Invalid word parameter")
    
    if category not in SENSITIVE_WORDS_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unknown category: {category}")
    
    if not word:
        raise HTTPException(status_code=400, detail="Word cannot be empty")
    
    if word not in SENSITIVE_WORDS_CONFIG[category]["words"]:
        raise HTTPException(status_code=404, detail=f"词汇 '{word}' 不存在")
    
    SENSITIVE_WORDS_CONFIG[category]["words"].remove(word)
    
    if word in SENSITIVE_WORDS_CONFIG[category]["replacements"]:
        del SENSITIVE_WORDS_CONFIG[category]["replacements"][word]
    
    save_sensitive_words_config(SENSITIVE_WORDS_CONFIG)
    print(f"[DELETE WORD] Removed '{word}' from {category}", flush=True)
    
    return {
        "success": True,
        "message": "词汇已删除",
        "word": word,
        "category": category
    }

@app.post("/api/sensitive-words/reset")
async def reset_sensitive_words():
    """Reset sensitive words to default configuration"""
    global SENSITIVE_WORDS_CONFIG
    SENSITIVE_WORDS_CONFIG = DEFAULT_SENSITIVE_WORDS_CONFIG.copy()
    save_sensitive_words_config(SENSITIVE_WORDS_CONFIG)
    print("[CONFIG] Sensitive words reset to defaults", flush=True)
    return {
        "success": True,
        "message": "已重置为默认配置"
    }

@app.get("/api/config")
async def get_config():
    default_llm_config = {}
    default_config_path = os.path.join(CONFIG_DIR, "default_config.json")
    if os.path.exists(default_config_path):
        try:
            with open(default_config_path, "r", encoding="utf-8") as f:
                default_llm_config = json.load(f)
        except Exception as e:
            print(f"[CONFIG] Error loading default config: {e}", flush=True)
    
    return {
        "min_article_length": MIN_ARTICLE_LENGTH,
        "max_duplication_ratio": MAX_DUPLICATION_RATIO,
        "min_sentence_count": MIN_SENTENCE_COUNT,
        "available_styles": ["informative", "casual", "formal"],
        "default_llm_config": default_llm_config
    }


# Mount static files after API endpoints to ensure API routes are prioritized
if os.path.exists(frontend_dist_path):
    # Serve the entire dist directory to include version.js and other root files
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000)
