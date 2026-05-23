content = open('src/app/api/ai/generate-page-json/route.ts').read()
content = content.replace('\\`', '`').replace('\\${', '${')
with open('src/app/api/ai/generate-page-json/route.ts', 'w') as f:
    f.write(content)
