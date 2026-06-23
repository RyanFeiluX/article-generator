#!/usr/bin/env python3

# Print LLM configuration on startup
import os
import json
import sys

# Add current directory to Python path so we can import main.py
CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CONFIG_DIR)

default_config_path = os.path.join(CONFIG_DIR, "default_config.json")

print("\n" + "="*60)
print("   Article Generator - LLM Configuration")
print("="*60)

if os.path.exists(default_config_path):
    try:
        with open(default_config_path, "r", encoding="utf-8") as f:
            default_llm_config = json.load(f)
            provider = default_llm_config.get('provider', 'Not set')
            config = default_llm_config.get('config', {})
            print(f"   Default Provider: {provider}")
            print(f"   Default Model:    {config.get('model', 'Not set')}")
            print("\n   Available Providers:")
            print("   - volc (Volc Engine ARK)")
            print("   - openai")
            print("   - azure")
            print("   - anthropic")
            print("   - deepseek")
            print("   - kimi")
            print("   - custom")
            print("="*60 + "\n")
    except Exception as e:
        print(f"[STARTUP] Error loading default config: {e}", flush=True)
else:
    print(f"   [WARNING] Default config not found at: {default_config_path}")
    print("="*60 + "\n")

# Now launch uvicorn - import directly
from main import app
import uvicorn
uvicorn.run(app, host="0.0.0.0", port=5000)
