import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDifficulty } from './difficulty.js';

test('classifies explicit beginner labels from GitHub label objects', () => {
  assert.equal(classifyDifficulty({ labels: [{ name: 'good first issue' }] }), 'Beginner');
});

test('classifies explicit advanced labels from strings', () => {
  assert.equal(classifyDifficulty({ labels: ['bug', 'advanced'] }), 'Advanced');
});

test('does not guess difficulty without matching metadata', () => {
  assert.equal(classifyDifficulty({ labels: ['bug', 'help wanted'] }), 'Unclassified');
});

test('beginner label takes priority when labels conflict', () => {
  assert.equal(classifyDifficulty({ labels: ['advanced', 'easy'] }), 'Beginner');
});

test('matches labels without depending on capitalization or surrounding whitespace', () => {
  assert.equal(classifyDifficulty({ labels: [{ name: '  BEGINNER  ' }] }), 'Beginner');
});

test('handles absent, malformed, or non-array labels safely', () => {
  assert.equal(classifyDifficulty({}), 'Unclassified');
  assert.equal(classifyDifficulty({ labels: null }), 'Unclassified');
  assert.equal(classifyDifficulty({ labels: [null, {}, 7] }), 'Unclassified');
});

test('classifies documented intermediate label patterns', () => {
  assert.equal(classifyDifficulty({ labels: ['medium difficulty'] }), 'Intermediate');
});
