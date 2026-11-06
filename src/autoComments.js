/**
 * After the owner publishes a post, generate genuine Gemini comments automatically.
 * Each persona gets its own request. Failure from one persona must not prevent others.
 * Previously generated replies are passed as context to avoid repetitive roasts.
 */
export async function runInitialComments({
  post, agents, numberOfAgents = 3, generate, addComment,
  postStillExists = () => true, random = Math.random
}) {
  const shuffled = [...agents];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const count = Math.min(shuffled.length, Math.max(1, Math.min(5, Number(numberOfAgents) || 3)));
  const history = [];
  let posted = 0;
  const failures = [];
  for (const persona of shuffled.slice(0, count)) {
    if (!postStillExists()) break;
    try {
      const result = await generate({ agentId: persona.id, post, history: [...history], mode: 'seed' });
      if (!postStillExists()) break;
      if (result?.source !== 'gemini' || !result.text?.trim()) {
        throw new Error('Gemini không trả về bình luận hợp lệ.');
      }
      addComment(post.id, { agentId: persona.id, text: result.text, source: 'gemini' });
      history.push({ role: 'ai', name: persona.name, text: result.text });
      posted++;
    } catch (error) {
      failures.push(error?.message || 'Lỗi Gemini không xác định.');
    }
  }
  return { posted, failed: failures.length, firstError: failures[0] || null };
}
