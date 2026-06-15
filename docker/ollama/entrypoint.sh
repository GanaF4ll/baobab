#!/bin/bash

# Start Ollama in the background
ollama serve &

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
while ! curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 1
done

echo "Ollama is ready. Pulling models..."
# LLM model
ollama pull llama3
# Embedding model
ollama pull nomic-embed-text

echo "Models pulled successfully."

# Keep the container running by bringing Ollama back to the foreground
wait
