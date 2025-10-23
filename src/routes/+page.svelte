<script>
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import logo from '$lib/assets/house-hero-all-white.png';

  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  async function handleLogin() {
    if (!email || !password) {
      error = 'Please fill in all fields';
      return;
    }

    loading = true;
    error = '';

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        error = signInError.message;
      } else {
        goto('/tasks');
      }
    } catch (err) {
      error = 'An unexpected error occurred';
      console.error('Login error:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-page">
  <!-- Logo -->
  <div class="logo-section">
    <img src={logo} alt="House Hero Logo" class="logo" />
  </div>

  <!-- Form -->
  <form class="login-form" on:submit|preventDefault={handleLogin}>
    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <label for="email">Username</label>
    <input
      type="email"
      id="email"
      placeholder="Enter username or email"
      bind:value={email}
      required
      disabled={loading}
    />

    <label for="password">Password</label>
    <input
      type="password"
      id="password"
      placeholder="Enter password"
      bind:value={password}
      required
      disabled={loading}
    />

    <button type="submit" class="login-btn" disabled={loading}>
      {loading ? 'Logging in...' : 'Login'}
    </button>
  </form>

  <!-- Footer Links -->
  <div class="footer-links">
    <p>Don’t have an account?</p>
    <a href="/sign-up" class="signup-link">Sign Up</a>

    <a href="/tasks" class="tasks-link">Go to Tasks</a>
  </div>
</div>

<style>
  /* Page background & layout */
  .login-page {
    background-color: #a5d9d4;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', sans-serif;
    padding: 1rem;
  }

  /* Logo & title */
  .logo-section {
    text-align: center;
    margin-bottom: 2rem;
  }

  .logo {
    width: 120px;
    height: auto;
    margin-bottom: 0.5rem;
  }

  .logo-section h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    letter-spacing: 1px;
  }

  /* Form styling */
  .login-form {
    display: flex;
    flex-direction: column;
    width: 80%;
    max-width: 320px;
    text-align: left;
  }

  label {
    font-weight: 600;
    font-size: 0.85rem;
    color: #0d0d0d;
    margin-bottom: 0.2rem;
  }

  input {
    border: none;
    outline: none;
    border-radius: 20px;
    padding: 0.7rem 1rem;
    margin-bottom: 1rem;
    background: white;
    font-size: 0.9rem;
  }

  input::placeholder {
  font-style: italic;
  color: rgba(0, 0, 0, 0.6); /* optional: makes it slightly softer */
  }

  .login-btn {
    background-color: #ffd54f;
    color: #000;
    border: none;
    border-radius: 10px;
    padding: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.3s;
    margin-top: 0.5rem;
  }

  .login-btn:hover {
    background-color: #ffca28;
  }

  .error-message {
    color: red;
    margin-bottom: 1rem;
    text-align: center;
  }

  /* Footer links */
  .footer-links {
    margin-top: 1.5rem;
    text-align: center;
  }

  .footer-links p {
    font-size: 0.85rem;
    color: #0d0d0d;
    margin-bottom: 0.3rem;
  }

  .signup-link {
    display: inline-block;
    background: white;
    color: #333;
    border-radius: 10px;
    padding: 0.6rem 1rem;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.3s;
    margin-bottom: 0.8rem;
  }

  .signup-link:hover {
    background-color: #f5f5f5;
  }

  .tasks-link {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #0d0d0d;
    text-decoration: none;
  }

  .tasks-link:hover {
    text-decoration: underline;
  }
</style>
