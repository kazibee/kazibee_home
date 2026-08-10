import { createImageRenderer } from '@noego/forge/test';
import { createStaticRenderer } from '@noego/forge/static';
import { buildTailwindTemplate } from '../helpers/templates';
import { LAYOUT_PROPS } from '../helpers/mock-data';

const noop = () => {};
const asyncNoop = async () => {};
const dashboardInput = {
  refresh: asyncNoop,
  openRename: noop,
  setRenameValue: noop,
  cancelRename: noop,
  rename: asyncNoop,
  openRevoke: noop,
  cancelRevoke: noop,
  revoke: asyncNoop,
  logout: asyncNoop,
};
const claimInput = { refresh: asyncNoop, decide: asyncNoop };
const authInput = {
  setUsername: noop,
  setPassword: noop,
  setConfirmPassword: noop,
  submit: asyncNoop,
};

const executorBase = {
  online: true,
  state: 'active',
  protocolVersion: '1.0',
  canManage: true,
};

const executorStates = [
  { ...executorBase, executorId: 'exe_online123', displayName: 'Office Mac', presence: 'online', statusLabel: 'Online', statusTone: 'green' },
  { ...executorBase, executorId: 'exe_offline12', displayName: 'Home Linux', online: false, presence: 'offline', statusLabel: 'Offline', statusTone: 'neutral' },
  { ...executorBase, executorId: 'exe_stale1234', displayName: 'Studio PC', online: false, presence: 'stale', statusLabel: 'Stale', statusTone: 'amber' },
  { ...executorBase, executorId: 'exe_revoked12', displayName: 'Old laptop', online: false, state: 'revoked', presence: 'offline', statusLabel: 'Revoked', statusTone: 'red', canManage: false },
];

const claim = {
  claimKind: 'executor',
  claimId: 'clm_12345678',
  status: 'pending',
  displayName: 'Office Mac',
  platform: 'macos',
  architecture: 'arm64',
  clientVersion: '1.0.0',
  keyFingerprint: 'a'.repeat(64),
  expiresAt: '2026-07-25T18:00:00.000Z',
};

function dashboardData(overrides: Record<string, unknown>) {
  return {
    status: 'ready',
    executors: [],
    error: null,
    actionError: null,
    renameId: null,
    renameValue: '',
    revokeId: null,
    busyId: null,
    ...overrides,
  };
}

function claimData(status: string, overrides: Record<string, unknown> = {}) {
  return {
    status: 'ready',
    claim: { ...claim, status },
    error: null,
    decisionStatus: status === 'accepted' || status === 'denied' ? status : 'idle',
    returnTarget: '/connect/claim/clm_12345678',
    fingerprintLabel: 'aaaaaaaa aaaaaaaa aaaaaaaa aaaaaaaa aaaaaaaa aaaaaaaa aaaaaaaa aaaaaaaa',
    expiryLabel: 'Jul 25, 2026, 2:00 PM',
    ...overrides,
  };
}

async function main() {
  const staticRenderer = await createStaticRenderer({
    stitchConfig: './src/ui/stitch.yaml',
    componentDir: './src/ui',
  });

  const cases = [
    {
      name: 'login',
      route: '/connect/login',
      view: { data: { mode: 'login', username: '', password: '', confirmPassword: '', status: 'idle', error: null, returnTo: '/connect', loginHref: '/connect/login', signupHref: '/connect/signup' }, input: authInput },
      expected: ['Welcome back', 'connect-auth-form'],
    },
    {
      name: 'signup-validation',
      route: '/connect/signup',
      view: { data: { mode: 'signup', username: 'x', password: '', confirmPassword: '', status: 'error', error: 'Passwords do not match.', returnTo: '/connect', loginHref: '/connect/login', signupHref: '/connect/signup' }, input: authInput },
      expected: ['Create your account', 'Passwords do not match.'],
    },
    {
      name: 'loading',
      route: '/connect',
      view: { data: dashboardData({ status: 'loading' }), input: dashboardInput },
      expected: ['Your executors', 'connect-loading'],
    },
    {
      name: 'empty',
      route: '/connect',
      view: { data: dashboardData({}), input: dashboardInput },
      expected: ['No executors connected', 'connect-empty'],
    },
    {
      name: 'presence',
      route: '/connect',
      view: { data: dashboardData({ executors: executorStates }), input: dashboardInput },
      expected: ['Online', 'Offline', 'Stale', 'Revoked'],
    },
    {
      name: 'dashboard-error',
      route: '/connect',
      view: { data: dashboardData({ status: 'error', error: 'Registry unavailable.' }), input: dashboardInput },
      expected: ['Executors could not be loaded', 'Registry unavailable.'],
    },
    {
      name: 'claim-pending',
      route: '/connect/claim/clm_12345678',
      view: { data: claimData('pending'), input: claimInput },
      expected: ['Accept connection', 'Deny', 'Office Mac'],
    },
    {
      name: 'claim-accepted',
      route: '/connect/claim/clm_12345678',
      view: { data: claimData('accepted'), input: claimInput },
      expected: ['Connection accepted', 'View your executors'],
    },
    {
      name: 'claim-denied',
      route: '/connect/claim/clm_12345678',
      view: { data: claimData('denied'), input: claimInput },
      expected: ['Connection denied', 'No credentials were issued'],
    },
    {
      name: 'claim-error',
      route: '/connect/claim/clm_12345678',
      view: { data: claimData('pending', { status: 'error', claim: null, error: 'Request not found.' }), input: claimInput },
      expected: ['Connection request unavailable', 'Request not found.'],
    },
  ];

  for (const testCase of cases) {
    const result = await staticRenderer.render({
      route: testCase.route,
      data: { layout: LAYOUT_PROPS, view: testCase.view },
    });
    for (const expected of testCase.expected) {
      if (!result.html.includes(expected)) {
        throw new Error(`${testCase.name}: expected rendered HTML to include "${expected}"`);
      }
    }
  }
  console.log(`Connect UI static rendering: ${cases.length} states passed.`);

  const imageRenderer = await createImageRenderer({
    outputDir: './test/output/screenshots/connect',
    staticRenderer,
    template: await buildTailwindTemplate(),
  });
  try {
    const imageCases = [
      cases[0],
      cases[1],
      cases[4],
      cases[6],
      cases[7],
      cases[8],
    ];
    for (const testCase of imageCases) {
      for (const resolution of [
        { name: 'desktop', width: 1440, height: 1000 },
        { name: 'mobile', width: 375, height: 812 },
      ]) {
        await imageRenderer.capture(`${testCase.name}-${resolution.name}`, testCase.route, {
          width: resolution.width,
          height: resolution.height,
          view: testCase.view,
          layout: LAYOUT_PROPS,
        });
      }
    }
  } finally {
    await imageRenderer.close();
  }

  console.log(`Connect UI: ${cases.length} static states and 12 responsive screenshots passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
