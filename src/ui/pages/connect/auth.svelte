<script lang="ts">
  let { data, input } = $props();
</script>

<section class="relative overflow-hidden px-5 py-12 sm:px-8 sm:py-20" data-test-id="connect-auth-page">
  <div class="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-honey-50 to-transparent"></div>
  <div class="relative mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1fr_440px]">
    <div class="hidden lg:block">
      <p class="text-sm font-bold uppercase tracking-[0.2em] text-honey-600">Kazibee Connect</p>
      <h1 class="mt-4 max-w-lg text-5xl font-black tracking-tight text-ink">
        Your executors. Clearly connected.
      </h1>
      <p class="mt-5 max-w-lg text-lg leading-8 text-ink-muted">
        Review connection requests and manage the executors you own. Work continues in your Kazibee apps—not in this website.
      </p>
    </div>

    <div class="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl shadow-neutral-200/40 sm:p-9" data-test-id="connect-auth-card">
      <div class="flex items-center gap-3">
        <img src="/images/logo_bold_128_transparent.png" alt="" class="h-11 w-11" />
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-honey-600">Connect</p>
          <h1 class="text-2xl font-bold tracking-tight text-ink" data-test-id="connect-auth-title">
            {data.mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
        </div>
      </div>

      <p class="mt-5 text-sm leading-6 text-ink-muted">
        {data.mode === 'signup'
          ? 'Create an individual account to own and manage your Kazibee executors.'
          : 'Sign in to manage executors and review connection requests.'}
      </p>

      {#if data.status === 'success' && data.mode === 'signup'}
        <div class="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5" role="status" data-test-id="connect-signup-success">
          <p class="font-semibold text-green-900">Account created</p>
          <p class="mt-1 text-sm text-green-800">Your account is ready. Sign in to continue.</p>
          <a href={data.loginHref} class="mt-4 inline-flex rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">
            Continue to sign in
          </a>
        </div>
      {:else}
        <form
          class="mt-7 space-y-5"
          data-test-id="connect-auth-form"
          onsubmit={(event) => {
            event.preventDefault();
            input.submit();
          }}
        >
          <label class="block">
            <span class="text-sm font-semibold text-ink">Username</span>
            <input
              type="text"
              name="username"
              value={data.username}
              autocomplete="username"
              minlength="3"
              maxlength="64"
              required
              aria-describedby={data.error ? 'connect-auth-error' : undefined}
              oninput={(event) => input.setUsername(event.currentTarget.value)}
              class="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              data-test-id="connect-username"
            />
          </label>

          <label class="block">
            <span class="text-sm font-semibold text-ink">Password</span>
            <input
              type="password"
              name="password"
              value={data.password}
              autocomplete={data.mode === 'signup' ? 'new-password' : 'current-password'}
              minlength="12"
              maxlength="128"
              required
              oninput={(event) => input.setPassword(event.currentTarget.value)}
              class="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              data-test-id="connect-password"
            />
          </label>

          {#if data.mode === 'signup'}
            <label class="block">
              <span class="text-sm font-semibold text-ink">Confirm password</span>
              <input
                type="password"
                name="confirm-password"
                value={data.confirmPassword}
                autocomplete="new-password"
                minlength="12"
                maxlength="128"
                required
                oninput={(event) => input.setConfirmPassword(event.currentTarget.value)}
                class="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                data-test-id="connect-confirm-password"
              />
            </label>
          {/if}

          {#if data.error}
            <div id="connect-auth-error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" data-test-id="connect-auth-error">
              {data.error}
            </div>
          {/if}

          <button
            type="submit"
            disabled={data.status === 'submitting'}
            class="flex w-full items-center justify-center rounded-xl bg-ink px-5 py-3.5 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60"
            data-test-id="connect-auth-submit"
          >
            {data.status === 'submitting'
              ? (data.mode === 'signup' ? 'Creating account…' : 'Signing in…')
              : (data.mode === 'signup' ? 'Create account' : 'Sign in')}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-ink-muted">
          {#if data.mode === 'signup'}
            Already have an account?
            <a href={data.loginHref} class="font-semibold text-blue-600 hover:text-blue-500">Sign in</a>
          {:else}
            New to Connect?
            <a href={data.signupHref} class="font-semibold text-blue-600 hover:text-blue-500">Create an account</a>
          {/if}
        </p>
      {/if}
    </div>
  </div>
</section>
