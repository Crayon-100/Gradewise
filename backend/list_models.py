import os
from google import genai

client = genai.Client()
print("Available Models:")
for m in client.models.list():
    if "generateContent" in m.supported_generation_methods:
        print(f"- {m.name}")
