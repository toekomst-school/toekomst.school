<script lang="ts">
  import QrCode from 'svelte-qrcode';
  import { onMount } from 'svelte';

  let code = '';
  let started = false;
  let qrUrl = '';

  // Generate a random 4-character code (A-Z, 0-9)
  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  onMount(() => {
    code = generateCode();
    const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
    qrUrl = `${baseUrl}/connect?code=${code}`;
  });

  function startLesson() {
    started = true;
  }
</script>

<div class="connect-container">
  <h1>verbind je device</h1>
  <div class="code-section">
    <span class="code-label">Code:</span>
    <span class="code-value">{code}</span>
  </div>
  <div class="qr-section">
    {#if qrUrl}
      <QrCode value={qrUrl} size={200} />
      <div class="qr-url">{qrUrl}</div>
    {/if}
  </div>
  <input
    class="code-input"
    type="text"
    maxlength="4"
    pattern="[0-9A-Z]{4}"
    placeholder="4-cijferige code"
    bind:value={code}
    disabled={!started}
    autocomplete="off"
    inputmode="text"
  />
  <button class="start-btn" on:click={startLesson} disabled={started}>start deze les</button>
</div>

<style>
.connect-container {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}
.connect-container h1 {
  font-size: 2.5rem;
  color: #222;
  font-weight: bold;
  margin-bottom: 1.5rem;
}
.code-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}
.code-label {
  color: #888;
  font-weight: 500;
}
.code-value {
  font-family: monospace;
  font-size: 2.2rem;
  letter-spacing: 0.3em;
  color: #3ba39b;
  background: #f0f0f0;
  padding: 0.2em 0.7em;
  border-radius: 6px;
}
.qr-section {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.qr-url {
  font-size: 0.9rem;
  color: #888;
  word-break: break-all;
  text-align: center;
}
.code-input {
  font-size: 2.2rem;
  text-align: center;
  width: 10rem;
  padding: 0.7em 0.5em;
  border: 2px solid #eaeaea;
  border-radius: 8px;
  background: #fafafa;
  color: #222;
  letter-spacing: 0.5em;
  outline: none;
  transition: border 0.2s;
}
.code-input:focus {
  border-color: #3ba39b;
}
.start-btn {
  font-size: 1.3rem;
  padding: 0.7em 2.5em;
  border: none;
  border-radius: 8px;
  background: #3ba39b;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}
.start-btn:disabled {
  background: #eaeaea;
  color: #aaa;
  cursor: not-allowed;
}
</style> 