<script>
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import logo from '$lib/assets/house-hero-all-white.png';

  let email = '';
  let password = '';
  let fullName = '';
  let loading = false;
  let error = '';

  async function handleSignup() {
    if (!email || !password || !fullName) {
      error = 'Please fill in all required fields';
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
        alert('Signup successful! Please check your email to confirm your account.');
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
    <label for="fullName">Full Name</label>
    <input id="fullName" type="text" bind:value={fullName} placeholder="Enter Name" required disabled={loading} />

    <label for="email">Email</label>
    <input id="email" type="email" bind:value={email} placeholder="Enter Email" required disabled={loading} />

    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} placeholder="Create Password" required disabled={loading} />

    <button type="submit" class="login-btn" disabled={loading}>
      {loading ? 'Signing Up...' : 'Create Account'}
    </button>

    <p class="switch-text">
      Already have an account? <a href="/">Login</a>
    </p>
  </form>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', sans-serif;
  }
 
  .signup-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    text-align: center;
    background-color: #a5d9d4;
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
    border-radius: 20px;
    padding: 0.7rem 1rem;
    margin-bottom: 1rem;
    background: white;
    font-size: 0.9rem;
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
