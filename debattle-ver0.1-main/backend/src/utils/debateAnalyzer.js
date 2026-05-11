const Groq = require('groq-sdk');

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const analyzeDebate = async (topic, proCues, conCues) => {
  try {
    const proArguments = proCues.map((cue, i) => `${i + 1}. ${cue}`).join('\n');
    const conArguments = conCues.map((cue, i) => `${i + 1}. ${cue}`).join('\n');

    const prompt = `You are an expert debate judge. Analyze the following debate and provide a detailed assessment.

Topic: "${topic}"

NOTE: These arguments were transcribed from spoken audio and may contain filler words, repetitions, or imperfect grammar. Normalize the arguments into clear written form, and judge the intended meaning of each speaker rather than penalizing transcription noise.

PRO ARGUMENTS:
${proArguments || '(No arguments provided)'}

CON ARGUMENTS:
${conArguments || '(No arguments provided)'}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "proScore": <number 0-100>,
  "conScore": <number 0-100>,
  "proStrengths": [<list of key strengths from pro arguments>],
  "proWeaknesses": [<list of key weaknesses in pro arguments>],
  "conStrengths": [<list of key strengths from con arguments>],
  "conWeaknesses": [<list of key weaknesses in con arguments>],
  "summary": "<detailed summary of the debate and why one side won>",
  "winner": "<'PRO' or 'CON'>",
  "reasoning": "<1-2 sentence explanation of the winner decision>"
}

Consider:
- Logical consistency and coherence
- Use of evidence or examples
- Counter-argument acknowledgment
- Persuasiveness and rhetorical strength
- Relevance to the topic

Respond only with valid JSON.`;

    const response = await client.chat.completions.create({  // ✅ Groq/OpenAI syntax
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = response.choices[0].message.content;  // ✅ Groq/OpenAI syntax

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse Groq response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      proScore: analysis.proScore || 50,
      conScore: analysis.conScore || 50,
      analysis: {
        proStrengths: analysis.proStrengths || [],
        proWeaknesses: analysis.proWeaknesses || [],
        conStrengths: analysis.conStrengths || [],
        conWeaknesses: analysis.conWeaknesses || [],
        summary: analysis.summary || 'Debate analysis complete',
        reasoning: analysis.reasoning || '',
      },
      winner: analysis.winner || (analysis.proScore > analysis.conScore ? 'PRO' : 'CON'),
    };
  } catch (err) {
    console.error('Error analyzing debate with Groq:', err);
    return {
      proScore: Math.random() * 100,
      conScore: Math.random() * 100,
      analysis: {
        proStrengths: ['Unable to analyze - API error'],
        proWeaknesses: [],
        conStrengths: ['Unable to analyze - API error'],
        conWeaknesses: [],
        summary: 'Debate analysis unavailable due to system error',
        reasoning: 'API temporarily unavailable',
      },
      winner: 'DRAW',
    };
  }
};

module.exports = { analyzeDebate };