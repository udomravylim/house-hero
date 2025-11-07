<script>
  import BottomNav from '$lib/components/BottomNav.svelte';
  import FaCrown from 'svelte-icons/fa/FaCrown.svelte';
  import FaFire from 'svelte-icons/fa/FaFire.svelte';
  import FaMedal from 'svelte-icons/fa/FaMedal.svelte';

  let view = 'individual';

  let members = [
    {
      id: 1,
      name: 'Russell',
      points: 320,
      streak: 7,
      badges: ['Clean Machine', 'Early Bird'],
      avatar: null
    },
    {
      id: 2,
      name: 'Alex',
      points: 275,
      streak: 4,
      badges: ['Power Week'],
      avatar: null
    },
    {
      id: 3,
      name: 'Taylor',
      points: 200,
      streak: 2,
      badges: [],
      avatar: null
    }
  ];

  const householdGoal = 1000;
  let householdTotal = members.reduce((s, m) => s + m.points, 0);
  let topContributor = members[0].name;

  $: sortedMembers = [...members].sort((a, b) => b.points - a.points);

  function switchTo(v) {
    view = v;
  }
</script>

<main>
  <header>
    <h1>Leaderboard</h1>
    <div class="toggle-wrap" role="tablist" aria-label="View toggle">
      <div class="toggle" class:household={view === 'household'}>
        <button class="toggle-btn left" aria-pressed={view === 'individual'} on:click={() => switchTo('individual')}>
          Individual
        </button>
        <button class="toggle-btn right" aria-pressed={view === 'household'} on:click={() => switchTo('household')}>
          Household
        </button>
        <div class="slider" class:slide-right={view === 'household'}></div>
      </div>
    </div>
  </header>

  <section class="list">
    {#if view === 'individual'}
      <div class="cards">
        {#each sortedMembers as member, i}
          <article class="member-card">
            <div class="member-top">
              <div class="rank">
                {#if i === 0}
                  <div style="width: 18px; height: 18px; display: inline-flex; align-items: center;"><FaCrown /></div>
                {:else}
                  <div class="rank-number">{i + 1}</div>
                {/if}
              </div>
              <div class="member-info">
                <div class="name-row">
                  <h2 class="member-name">{member.name}</h2>
                  <div class="points-pill">
                    <span class="points">{member.points}</span>
                    <span class="pts">pts</span>
                  </div>
                </div>
                <div class="meta-row">
                  <div class="streak">
                    <div style="width: 14px; height: 14px; display: inline-flex; align-items: center; margin-right: 6px;"><FaFire /></div>
                    <span>{member.streak}-day</span>
                  </div>
                  <div class="badge-list">
                    {#each member.badges as b}
                      <span class="badge">{b}</span>
                    {/each}
                  </div>
                </div>
              </div>
            </div>

            <p class="member-note">Any notes or recent achievement summaries can appear here.</p>
          </article>
        {/each}
      </div>
    {:else}
      <div class="household-card">
        <div class="house-summary">
          <h2>This Week’s Progress</h2>
          <p class="house-stats">{householdTotal} / {householdGoal} pts</p>

          <div class="progress-bar">
            <div class="progress-fill" style="width: {Math.min((householdTotal / householdGoal) * 100, 100)}%"></div>
          </div>

          <div class="house-meta">
            <div>Top Contributor: <strong>{topContributor}</strong></div>
            <div>Total Chores: <strong>{Math.floor(householdTotal / 10)}</strong></div>
          </div>

          <div class="house-badges">
            <div class="house-badge">
              <div style="width: 14px; height: 14px; display: inline-flex; align-items: center;"><FaMedal /></div> Weekly Goal
            </div>
            <div class="house-badge">
              <div style="width: 14px; height: 14px; display: inline-flex; align-items: center;"><FaFire /></div> Streak Challenge
            </div>
          </div>
        </div>

        <div class="members-compact">
          {#each sortedMembers as member}
            <div class="member-compact">
              <div class="m-left">
                <div class="mc-name">{member.name}</div>
                <div class="mc-streak">
                  <div style="width: 12px; height: 12px; display: inline-flex; align-items: center; margin-right: 4px;"><FaFire /></div>
                  {member.streak}-day
                </div>
              </div>
              <div class="m-right">
                <div class="mc-points">{member.points} pts</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <BottomNav />
</main>

<style>
  main {
    max-width: 420px;
    margin: 0 auto;
    padding: 28px 20px 100px;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }

  h1 {
    font-size: 32px;
    font-weight: 800;
    margin: 0;
  }

  .toggle-wrap {
    display: flex;
    align-items: center;
  }

  .toggle {
    position: relative;
    width: 170px;
    height: 40px;
    background: transparent;
    border-radius: 999px;
    display: flex;
    align-items: center;
    padding: 4px;
  }

  .toggle-btn {
    flex: 1;
    z-index: 2;
    background: transparent;
    border: none;
    font-weight: 600;
    cursor: pointer;
    color: #0d0d0d;
    border-radius: 999px;
    height: 32px;
  }

  .slider {
    position: absolute;
    top: 4px;
    left: 4px;
    width: calc(50% - 8px);
    height: 32px;
    background: white;
    border-radius: 999px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    transition: transform 220ms cubic-bezier(0.2,0.9,0.2,1);
    z-index: 1;
  }

  .slider.slide-right {
    transform: translateX(100%);
  }

  .list {
    margin-top: 8px;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .member-card {
    background: #dff5f3;
    width: 82%;
    max-width: 360px;
    border-radius: 12px;
    padding: 0.9rem;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    box-sizing: border-box;
    position: relative;
  }

  .member-top {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .rank {
    width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rank-number {
    background: rgba(0,0,0,0.06);
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }

  .member-info {
    flex: 1;
  }

  .name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .member-name {
    font-size: 1.05rem;
    margin: 0;
    font-weight: 700;
    color: #0d0d0d;
  }

  .points-pill {
    background: #ffd54f;
    border-radius: 10px;
    padding: 0.25rem 0.6rem;
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-weight: 700;
    color: #000;
    font-size: 0.9rem;
  }

  .points {
    font-size: 1rem;
  }
  .pts {
    font-size: 0.7rem;
  }

  .meta-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.45rem;
    flex-wrap: wrap;
  }

  .streak {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #0d0d0d;
    background: rgba(0,0,0,0.03);
    padding: 0.25rem 0.5rem;
    border-radius: 8px;
    font-size: 0.85rem;
  }

  .badge-list {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .badge {
    background: white;
    padding: 0.22rem 0.45rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }

  .member-note {
    margin: 0.9rem 0 0;
    color: #0d0d0d;
    font-size: 0.9rem;
    opacity: 0.95;
  }

  .household-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    padding-bottom: 4rem;
  }

  .house-summary {
    background: #dff5f3;
    width: 82%;
    max-width: 360px;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  }

  .house-summary h2 {
    margin: 0 0 0.25rem 0;
    font-weight: 700;
  }

  .house-stats {
    margin: 0 0 0.5rem 0;
    font-weight: 700;
  }

  .progress-bar {
    background: rgba(0,0,0,0.06);
    height: 12px;
    width: 100%;
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #ffd54f;
    width: 0%;
    transition: width 400ms ease;
  }

  .house-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 0.6rem;
    font-size: 0.9rem;
  }

  .house-badges {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }

  .house-badge {
    background: white;
    padding: 0.28rem 0.5rem;
    border-radius: 8px;
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-weight: 700;
  }

  .members-compact {
    width: 82%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .member-compact {
    background: rgba(255,255,255,0.14);
    padding: 0.6rem;
    border-radius: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mc-name {
    font-weight: 700;
  }

  .mc-streak {
    font-size: 0.85rem;
    opacity: 0.95;
  }

  .mc-points {
    font-weight: 700;
  }


  
  @media (max-width: 420px) {
    .toggle { width: 150px; }
    .member-card, .house-summary, .members-compact { width: 90%; }
  }
</style>
