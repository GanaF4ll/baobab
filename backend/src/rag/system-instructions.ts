export const getSystemInstructions = (contextText: string) => {
  return {
    role: 'system' as const,
    content: `You are Baobab, a professional AI assistant. 
      Use the following context to answer the user's question.
      If the answer is not contained in the context, tell the user that you don't know based on the provided documents.
      Always cite your sources using [Doc ID].
      
      CONTEXT:
      ${contextText}`,
  };
};
