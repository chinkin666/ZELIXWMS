/**
 * スキャンビープ音 / 扫描提示音
 *
 * Web Audio API を使用して軽量なビープ音を生成する
 * 使用 Web Audio API 生成轻量级提示音
 */

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

/**
 * 成功ビープ（短い高音）/ 成功提示音（短促高音）
 */
export function beepSuccess(): void {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.value = 1200
    gain.gain.value = 0.12

    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.stop(ctx.currentTime + 0.1)
  } catch {
    // Audio not available / オーディオ利用不可
  }
}

/**
 * エラービープ（低音2回）/ 错误提示音（低音两声）
 */
export function beepError(): void {
  try {
    const ctx = getAudioCtx()

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'square'
      osc.frequency.value = 400
      gain.gain.value = 0.08

      const start = ctx.currentTime + i * 0.15
      osc.start(start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1)
      osc.stop(start + 0.1)
    }
  } catch {
    // Audio not available
  }
}

/**
 * 完了チャイム（上昇3音）/ 完成提示（上升三音）
 */
export function beepComplete(): void {
  try {
    const ctx = getAudioCtx()
    const notes = [800, 1000, 1200]

    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.value = notes[i] ?? 0
      gain.gain.value = 0.1

      const start = ctx.currentTime + i * 0.12
      osc.start(start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15)
      osc.stop(start + 0.15)
    }
  } catch {
    // Audio not available
  }
}
