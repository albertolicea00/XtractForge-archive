const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

module.exports = {
  id: 'ollama',
  name: 'Ollama AI Discovery',
  description: 'Use a local AI model to discover and suggest downloadable content based on natural language queries',
  type: 'searcher',
  icon: '🤖',
  repoUrl: 'https://github.com/ollama/ollama',
  installHint: 'Download from https://ollama.com  then: ollama pull llama3',

  configSchema: [
    { key: 'ollamaHost', label: 'Ollama host URL', type: 'text', default: 'http://localhost:11434', placeholder: 'http://localhost:11434' },
    { key: 'ollamaModel', label: 'Model name', type: 'text', default: 'llama3', placeholder: 'llama3, mistral, phi3, gemma2...' },
  ],

  checkDependency(config) {
    const host = (config.ollamaHost || 'http://localhost:11434').replace(/\/$/, '');
    try {
      const out = execSync(`curl -s --max-time 3 "${host}/api/tags"`, { encoding: 'utf8', timeout: 4000 });
      const data = JSON.parse(out);
      const models = (data.models || []).map(m => m.name);
      const version = models.length > 0 ? models.slice(0, 3).join(', ') : 'no models loaded';
      return { available: true, version };
    } catch {
      return { available: false, version: '' };
    }
  },

  // Not a downloader — no URL handling
  canHandle() {
    return false;
  },

  search(query, config) {
    return new Promise((resolve, reject) => {
      const host = (config.ollamaHost || 'http://localhost:11434').replace(/\/$/, '');
      const model = config.ollamaModel || 'llama3';

      const prompt = `You are a media discovery assistant. The user wants to find downloadable media.

User query: "${query}"

Respond ONLY with a valid JSON array (no markdown, no explanation). Each object must have:
- "title": descriptive title (string)
- "searchQuery": a yt-dlp compatible search string starting with "ytsearch:" (string)
- "description": one sentence about this content (string)
- "type": "video" or "audio" (string)

Example:
[
  {"title":"Lofi hip hop beats","searchQuery":"ytsearch:lofi hip hop study beats","description":"Relaxing lofi beats for studying","type":"audio"},
  {"title":"Python tutorial","searchQuery":"ytsearch:python tutorial for beginners 2024","description":"Beginner Python programming tutorial","type":"video"}
]

Return 4-6 suggestions. JSON array only.`;

      const body = JSON.stringify({
        model,
        prompt,
        stream: false,
      });

      const isHttps = host.startsWith('https://');
      const transport = isHttps ? https : http;
      const urlObj = new URL(`${host}/api/generate`);

      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = transport.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk.toString(); });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const text = response.response || '';
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
              resolve({ results: [] });
              return;
            }
            const results = JSON.parse(jsonMatch[0]);
            resolve({ results: Array.isArray(results) ? results : [] });
          } catch (e) {
            reject(new Error('Failed to parse Ollama response: ' + e.message));
          }
        });
      });

      req.setTimeout(45000, () => {
        req.destroy();
        reject(new Error('Ollama request timed out (45s). Is the model loaded?'));
      });

      req.on('error', err => reject(new Error(`Ollama connection failed: ${err.message}`)));

      req.write(body);
      req.end();
    });
  },
};
