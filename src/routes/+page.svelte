<script>
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/user.js';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  
  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  let redirectMessage = '';

  // Check for redirect message
  $: if ($page.url.searchParams.get('message') === 'login-required') {
    redirectMessage = 'You need to login or create an account to view the tasks page.';
  }

  // Redirect authenticated users to tasks page
  $: if ($user) {
    goto('/tasks');
  }
  
  async function handleLogin() {
    // Basic form validation
    if (!email || !password) {
      error = 'Please fill in all fields';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
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

<h1>Login</h1>

{#if redirectMessage}
  <div style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; margin-bottom: 16px; border: 1px solid #ffeaa7;">
    {redirectMessage}
  </div>
{/if}

{#if error}
  <div style="color: red; margin-bottom: 10px;">
    {error}
  </div>
{/if}

<form on:submit|preventDefault={handleLogin}>
  <div>
    <label for="email">Email:</label>
    <input 
      type="email" 
      id="email" 
      bind:value={email} 
      required 
      disabled={loading}
    />
  </div>
  
  <div>
    <label for="password">Password:</label>
    <input 
      type="password" 
      id="password" 
      bind:value={password} 
      required 
      disabled={loading}
    />
  </div>
  
  <button type="submit" disabled={loading}>
    {loading ? 'Logging in...' : 'Login'}
  </button>
</form>

<div>
  <p>Don't have an account?</p>
  <a href="/sign-up">Sign Up</a>
</div>