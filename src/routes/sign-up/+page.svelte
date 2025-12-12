<script>
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import logo from '$lib/assets/house-hero-all-white.png';

  let email = '';
  let password = '';
  let confirmPassword = '';
  let fullName = '';
  let loading = false;
  let error = '';
  let showPassword = false;
  let showConfirmPassword = false;

  // Check if passwords match
  $: passwordsMatch = password && confirmPassword && password === confirmPassword;
  $: passwordsMismatch = confirmPassword && password !== confirmPassword;

  async function handleSignup() {
    if (!email || !password || !fullName || !confirmPassword) {
      error = 'Please fill in all required fields';
      return;
    }

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    loading = true;
    error = '';

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (signUpError) {
        error = signUpError.message;
      } else {
        alert('Signup successful! Welcome to House Hero');
        goto('/');
      }
    } catch (err) {
      error = 'An unexpected error occurred';
      console.error('Signup error:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="signup-container">
  <div class="logo-section">
    <img src={logo} alt="House Hero Logo" class="logo" />
  </div>

  <form class="signup-form" on:submit|preventDefault={handleSignup}>
    {#if error}
      <div class="error-message">{error}</div>
    {/if}
    <label for="fullName">Name</label>
    <input id="fullName" type="text" bind:value={fullName} placeholder="John Doe" required disabled={loading} />

    <label for="email">Email</label>
    <input id="email" type="email" bind:value={email} placeholder="john@example.com" required disabled={loading} />

    <label for="password">Password</label>
    <div class="password-input-wrapper">
      <input
        id="password"
        type={showPassword ? 'text' : 'password'}
        bind:value={password}
        placeholder="Create Password"
        required
        disabled={loading}
        class:password-match={passwordsMatch}
        class:password-mismatch={passwordsMismatch}
      />
      <button
        type="button"
        class="password-toggle"
        on:click={() => showPassword = !showPassword}
        disabled={loading}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? 'Hide' : 'Show'}
      </button>
    </div>

    <label for="confirmPassword">Confirm Password</label>
    <div class="password-input-wrapper">
      <input
        id="confirmPassword"
        type={showConfirmPassword ? 'text' : 'password'}
        bind:value={confirmPassword}
        placeholder="Confirm Password"
        required
        disabled={loading}
        class:password-match={passwordsMatch}
        class:password-mismatch={passwordsMismatch}
      />
      <button
        type="button"
        class="password-toggle"
        on:click={() => showConfirmPassword = !showConfirmPassword}
        disabled={loading}
        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
      >
        {showConfirmPassword ? 'Hide' : 'Show'}
      </button>
    </div>

    <button type="submit" class="login-btn" disabled={loading}>
      {loading ? 'Signing Up...' : 'Create Account'}
    </button>

    <p class="switch-text">
      Already have an account? <a href="/">Login</a>
    </p>
  </form>
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    height: 100%;
  }
 
  .signup-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    width: 100%;
    text-align: center;
    background-color: #a5d9d4;
    padding: 1rem;
    box-sizing: border-box;
  }

  .logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2rem;
  }

  .logo {
    width: 200px;
    height: auto;
    margin-bottom: 0.5rem;
  }

  .signup-form {
    background: transparent;
    display: flex;
    flex-direction: column;
    width: 80%;
    max-width: 320px;
  }

  label {
    text-align: left;
    font-size: 0.9rem;
    font-weight: 600;
    color: #0d0d0d;
    margin-bottom: 0.2rem;
  }

  input {
    border: none;
    outline: none;
    border-radius: 50px;
    padding: 0.7rem 1rem;
    margin-bottom: 1rem;
    background: white;
    font-size: 0.9rem;
    width: 100%;
    box-sizing: border-box;
    transition: border 0.3s;
  }

  .password-input-wrapper {
    position: relative;
    margin-bottom: 1rem;
    width: 100%;
  }

  .password-input-wrapper input {
    padding-right: 3rem;
    margin-bottom: 0;
  }

  .password-input-wrapper input.password-match {
    border: 2px solid #4caf50;
  }

  .password-input-wrapper input.password-mismatch {
    border: 2px solid #f44336;
  }

  .password-toggle {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: color 0.2s;
    white-space: nowrap;
  }

  .password-toggle:hover:not(:disabled) {
    color: #000;
  }

  .password-toggle:disabled {
    cursor: not-allowed;
    color: #999;
  }

  .login-btn {
    background-color: #ffd54f;
    color: #000;
    border: none;
    border-radius: 10px;
    padding: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.5rem;
    transition: background 0.3s;
  }

  .login-btn:hover {
    background-color: #ffca28;
  }

  .error-message {
    color: red;
    margin-bottom: 1rem;
  }

  .switch-text {
    font-size: 0.85rem;
    color: #0d0d0d;
    margin-top: 1rem;
  }

  .switch-text a {
    font-weight: 600;
    color: #000;
    text-decoration: none;
  }

  .switch-text a:hover {
    text-decoration: underline;
  }
</style>
