signup work
 <a href="/tasks">go to task</a>
<script>
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  
  let email = '';
  let password = '';
  let fullName = '';
  let loading = false;
  let error = '';
  
  async function handleSignup() {
    // Basic form validation
    if (!email || !password || !fullName) {
      error = 'Please fill in all required fields';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName
          }
        }
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

<h1>Sign Up</h1>

{#if error}
  <div style="color: red; margin-bottom: 10px;">
    {error}
  </div>
{/if}

<form on:submit|preventDefault={handleSignup}>
  <div>
    <label for="email">Email: *</label>
    <input 
      type="email" 
      id="email" 
      bind:value={email} 
      required 
      disabled={loading}
    />
  </div>
  
  <div>
    <label for="password">Password: *</label>
    <input 
      type="password" 
      id="password" 
      bind:value={password} 
      required 
      disabled={loading}
    />
  </div>
  
  <div>
    <label for="fullName">Full Name: *</label>
    <input 
      type="text" 
      id="fullName" 
      bind:value={fullName} 
      required 
      disabled={loading}
    />
  </div>
  
  <button type="submit" disabled={loading}>
    {loading ? 'Signing Up...' : 'Sign Up'}
  </button>
</form>

<div>
  <p>Already have an account?</p>
  <a href="/">Login</a>
</div>
