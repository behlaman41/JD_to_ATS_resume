import { jest } from '@jest/globals';
import { analyzeAndUpdateResume } from '../packages/ai-resume/src/index.ts';
import * as clientModule from '../packages/ai-resume/src/client.ts';

describe('analyzeAndUpdateResume', () => {
  it('returns parsed AI result', async () => {
    const fakeResponse = {
      plan: { objective: 'obj', constraints: [], riskChecks: [], jdHighlights: [], actions: [] },
      updatedResume: 'Updated',
      model: 'fake',
    };

    jest.spyOn(clientModule, 'createAiClient').mockReturnValue({
      client: {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: JSON.stringify(fakeResponse) } }],
            }),
          },
        },
      },
      model: 'fake',
      temperature: 0.2,
    } as any);

    const result = await analyzeAndUpdateResume('jd', 'resume');
    expect(result.updatedResume).toBe('Updated');
    expect(result.plan.objective).toBe('obj');
  });
});
