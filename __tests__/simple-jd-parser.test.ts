import fs from 'fs';
import path from 'path';
import JobDescriptionParser from '../lib/simple-jd-parser.js';

describe('JobDescriptionParser', () => {
  it('parses txt files correctly', async () => {
    const parser = new JobDescriptionParser();
    const filePath = path.join(__dirname, '..', 'test-jd.txt');
    const text = await parser.parseFile(filePath);
    const original = fs.readFileSync(filePath, 'utf8').trim();
    expect(text.trim()).toBe(original);
  });
});
