import { createStaticRenderer } from '@noego/forge/static';
import { LAYOUT_PROPS } from '../helpers/mock-data';

const EXPECTED_TEST_IDS = [
  'runtime-header',
  'runtime-title',
  'runtime-subtitle',
  'ai-driven-execution',
  'ai-execution-label',
  'ai-chat-mockup',
  'chat-user-bubble',
  'chat-ai-bubble',
  'ai-execution-callout',
  'execution-pipeline',
  'pipeline-label',
  'pipeline-steps',
  'pipeline-step-1',
  'pipeline-step-2',
  'pipeline-step-3',
  'pipeline-step-4',
  'ast-validation',
  'ast-blocked-list',
  'security-architecture',
  'security-cards',
  'security-ast-gate',
  'security-closed-surface',
  'security-scoped-secrets',
  'permission-model',
  'permissions-json-example',
  'permission-sources',
  'permission-note',
  'tool-context',
  'context-features',
  'context-code-example',
  'directory-scoping',
  'scoping-rules',
  'local-development',
  'local-development-label',
  'local-development-cards',
  'api-discovery',
  'api-discovery-label',
  'api-discovery-cards',
  'tool-commands',
  'tool-commands-label',
  'tool-commands-details',
  'setup-scripts',
  'setup-scripts-callout',
  'runtime-cta',
  'runtime-cta-actions',
  'runtime-cta-plugins',
  'runtime-cta-home',
];

const EXPECTED_TEXT = [
  'The Kazibee Runtime',
  'AI-Driven Execution',
  'The AI writes the code. Kazibee runs it safely.',
  'check my latest emails and summarize them in a Google Sheet',
  'Kazibee to read your Gmail and write to Google Sheets',
  'Execution pipeline',
  'AST Validation',
  'Tool Resolution',
  'In-Process Tool Loading',
  'Sandboxed Execution',
  'AST Validation deep dive',
  'Security architecture',
  'Static Analysis Gate',
  'Closed Execution Surface',
  'Scoped Secret Injection',
  'Permission model',
  'permissions.json',
  'Tool context and state',
  'ContextService',
  'Directory scoping',
  'Develop tools locally with link',
  'API discovery before execution',
  'kazibee show',
  'kazibee llm',
  'Tools can expose CLI commands',
  'Automated setup during installation',
  'Ready to explore?',
];

async function main() {
  const renderer = await createStaticRenderer({
    stitchConfig: './src/ui/stitch.yaml',
    componentDir: './src/ui',
  });

  const result = await renderer.render({
    route: '/runtime',
    data: {
      layout: LAYOUT_PROPS,
      view: {},
    },
  });

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  // Verify all data-test-id attributes are present
  for (const testId of EXPECTED_TEST_IDS) {
    if (result.html.includes(`data-test-id="${testId}"`)) {
      passed++;
    } else {
      failed++;
      failures.push(`Missing data-test-id: "${testId}"`);
    }
  }

  // Verify key text content is present
  for (const text of EXPECTED_TEXT) {
    if (result.html.includes(text)) {
      passed++;
    } else {
      failed++;
      failures.push(`Missing text: "${text}"`);
    }
  }

  // Verify the route resolved correctly
  if (result.route?.path === '/runtime') {
    passed++;
  } else {
    failed++;
    failures.push(`Route path mismatch: expected "/runtime", got "${result.route?.path}"`);
  }

  // Verify HTML is not empty
  if (result.html.length > 0) {
    passed++;
  } else {
    failed++;
    failures.push('Rendered HTML is empty');
  }

  // Verify CSS was generated
  if (result.css !== undefined) {
    passed++;
  } else {
    failed++;
    failures.push('No CSS output');
  }

  // Verify CTA links
  if (result.html.includes('href="/plugins"') && result.html.includes('href="/"')) {
    passed++;
  } else {
    failed++;
    failures.push('Missing CTA links to /plugins or /');
  }

  // Report results
  console.log(`\nRuntime page render test: ${passed} passed, ${failed} failed\n`);

  if (failures.length > 0) {
    for (const f of failures) {
      console.error(`  FAIL: ${f}`);
    }
    console.log('');
    process.exit(1);
  }

  console.log('All runtime page render checks passed.');
}

main().catch((err) => {
  console.error('Runtime render test failed:', err);
  process.exit(1);
});
