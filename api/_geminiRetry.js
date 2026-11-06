/**
 * Bound Gemini calls: overload or timeout on the primary model immediately tries
 * a separate real Gemini model. Each attempt has its own AbortController, so a
 * stalled primary request cannot consume all the fallback's available time.
 */
export async function requestGemini({
  primaryModel, fallbackModel, apiKey, makePayload,
  requestFetch = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  limits = [23000, 27000, 16000], log = console.error
}) {
  const hasFallback = !!fallbackModel
    && !['off','none','disabled'].includes(fallbackModel.toLowerCase())
    && primaryModel !== fallbackModel;
  const models = hasFallback
    ? [primaryModel, fallbackModel, fallbackModel]
    : [primaryModel, primaryModel];
  const attempts = [];
  let failure = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const timeout = limits[Math.min(i, limits.length - 1)] ?? 20000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await requestFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { method: 'POST',
          headers: {'Content-Type':'application/json','x-goog-api-key':apiKey},
          body: JSON.stringify(makePayload(model)),
          signal:controller.signal }
      );
      if (response.ok) {
        const json = await response.json();
        attempts.push({model, status:response.status || 200});
        return {ok:true, model, json, attempts};
      }
      const detail = await response.text();
      failure = {model, status:response.status, timeout:false};
      attempts.push(failure);
      log('Gemini error',response.status,'model:',model,detail.slice(0,300));
    } catch(error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        failure = {model, status:504, timeout:true};
        attempts.push(failure);
        log('Gemini request timed out',model,`after ${timeout}ms`);
      } else {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }

    // Permanent errors must not trigger more requests or drain the API quota.
    const retryable = failure.timeout || [500,502,503,504].includes(failure.status)
      || (failure.status===404 && hasFallback && model === primaryModel);
    if (!retryable || i === models.length - 1) break;
    // Keep backoff short; we switch to a *different* model after primary fails.
    await sleep(i === 0 ? 500 : 1200);
  }

  return {ok:false, model:failure?.model || primaryModel, failure, attempts};
}
