/**
 * After the owner publishes a post, generate genuine Gemini comments automatically.
 * Each persona gets its own request. Failure from one persona must not prevent others.
 * Previously generated replies are passed as context to avoid repetitive roasts.
 */
export async function runInitialComments({
  post, agents, numberOfAgents = 3, existingComments = [], generate, addComment,
  postStillExists = () => true, random = Math.random, onProgress = () => {}
}) {
  const shuffled = [...agents];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const target = Math.min(shuffled.length, Math.max(1, Math.min(5, Number(numberOfAgents) || 3)));
  // Continue an interrupted thread instead of generating a duplicate persona.
  const existingAgents = new Set(existingComments.filter(c=>c.aiId).map(c=>c.aiId));
  const waiting = shuffled.filter(a=>!existingAgents.has(a.id)).slice(0, Math.max(0,target-existingAgents.size));
  const count=waiting.length;
  const history=existingComments.slice(-16).map(c=>({
    role:c.aiId?'ai':'user',
    name:c.aiId?(agents.find(a=>a.id===c.aiId)?.name||'AI'):'Chủ thớt',
    text:String(c.text||'').slice(0,900)
  }));
  let posted = 0;
  const failures = [];
  for (const [index, persona] of waiting.entries()) {
    if (!postStillExists()) break;
    onProgress({phase:'generating', current:index+1, total:count, posted, failed:failures.length, persona:persona.name});
    try {
      const result = await generate({ agentId: persona.id, post, history: [...history], mode: 'seed' });
      if (!postStillExists()) break;
      if (result?.source !== 'gemini' || !result.text?.trim()) {
        throw new Error('Gemini không trả về bình luận hợp lệ.');
      }
      addComment(post.id, { agentId: persona.id, text: result.text, source: 'gemini' });
      history.push({ role: 'ai', name: persona.name, text: result.text });
      posted++;
      onProgress({phase:'comment', current:index+1, total:count, posted, failed:failures.length, persona:persona.name});
    } catch (error) {
      failures.push(error?.message || 'Lỗi Gemini không xác định.');
      onProgress({phase:'failed', current:index+1, total:count, posted, failed:failures.length, persona:persona.name, error:failures.at(-1)});
      // Stop when Google is overloaded or quota-limited; running the other
      // personas immediately would only multiply failed requests and costs.
      if(['GEMINI_OVERLOADED','GEMINI_QUOTA'].includes(error?.code))break;
    }
  }
  const summary = { posted, existing: existingAgents.size, remaining: Math.max(0,target-existingAgents.size-posted), target, failed: failures.length, firstError: failures[0] || null };
  onProgress({phase:'finished', current:count, total:count, ...summary});
  return summary;
}
