#!/bin/bash
set -e

# Handle shutdown signals
pid=0
term_handler() {
  if [ $pid -ne 0 ]; then
    kill -SIGTERM "$pid"
    wait "$pid"
  fi
  exit 143; # 128 + 15 -- SIGTERM
}
trap 'kill ${!}; term_handler' SIGTERM SIGINT

# Start Ollama in the background
ollama serve &
pid="$!"

# Wait for Ollama to be ready
echo "Waiting for Ollama API to be ready..."
while ! curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 1
done

# Pull models if specified
LLM_MODEL="${OLLAMA_LLM_MODEL:-qwen2.5:0.5b}"
EMBED_MODEL="${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}"

echo "Ollama is ready. Ensuring required models are installed..."
if [ -n "$LLM_MODEL" ]; then
    echo "▶ Pulling LLM model: $LLM_MODEL"
    ollama pull "$LLM_MODEL" || echo "⚠️ Warning: Failed to pull $LLM_MODEL, continuing..."
fi

if [ -n "$EMBED_MODEL" ]; then
    echo "▶ Pulling embedding model: $EMBED_MODEL"
    ollama pull "$EMBED_MODEL" || echo "⚠️ Warning: Failed to pull $EMBED_MODEL, continuing..."
fi

echo "✅ Ollama initialized with models."

# Wait for process
wait "$pid"
