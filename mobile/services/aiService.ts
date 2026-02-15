// AI Service for Task Decomposition
// Uses OpenAI via Emergent LLM Key

const EMERGENT_LLM_KEY = 'sk-emergent-932624d8e6b1152661';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `Tu es un expert en stratégies TDAH. Ta mission est de briser la paralysie de l'action.
Pour toute tâche soumise, décompose-la en :

- Une Étape 0 : Une action de moins de 30 secondes pour briser l'inertie.
- Micro-étapes : 3 à 5 actions concrètes (max 15 min par étape).

Format : Réponds uniquement en JSON valide : {"steps": [{"id": 0, "text": "...", "done": false}, {"id": 1, "text": "...", "done": false}]}.
Ne retourne RIEN d'autre que le JSON. Pas de texte avant ou après.`;

export interface TaskStep {
  id: number;
  text: string;
  done: boolean;
}

export interface TaskBreakdownResult {
  steps: TaskStep[];
}

export async function breakdownTask(taskText: string): Promise<TaskBreakdownResult> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMERGENT_LLM_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Décompose cette tâche en micro-étapes : "${taskText}"` },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const result: TaskBreakdownResult = JSON.parse(jsonStr);
    
    // Ensure all steps have proper structure
    result.steps = result.steps.map((step, index) => ({
      id: step.id ?? index,
      text: step.text,
      done: step.done ?? false,
    }));

    return result;
  } catch (error) {
    console.error('Error breaking down task:', error);
    
    // Fallback: generate simple steps if AI fails
    return {
      steps: [
        { id: 0, text: '🚀 Ouvre ton app et regarde cette tâche (30 sec)', done: false },
        { id: 1, text: `📝 Commence par la partie la plus simple de: "${taskText}"`, done: false },
        { id: 2, text: '⏱️ Travaille dessus pendant 10 minutes', done: false },
        { id: 3, text: '✅ Fais une petite pause et reviens', done: false },
      ],
    };
  }
}

export default breakdownTask;
