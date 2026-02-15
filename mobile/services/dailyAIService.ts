// Daily AI Services - Morning Gazette & Evening Review
// Uses OpenAI GPT-4o via Emergent LLM Key

const EMERGENT_LLM_KEY = 'sk-emergent-932624d8e6b1152661';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// ============================================
// MORNING GAZETTE (7h - 10h)
// ============================================

const MORNING_SYSTEM_PROMPT = `Tu es un coach TDAH bienveillant qui aide à démarrer la journée en douceur.
Ton rôle est d'analyser les tâches de l'utilisateur et de l'aider à se concentrer sur UNE SEULE chose.

Règles :
- Choisis LA tâche la plus importante/urgente comme "Victoire du Jour"
- Propose une "Étape 0" réalisable en moins de 30 secondes pour briser l'inertie
- Ajoute un message d'encouragement court et chaleureux
- Sois bref, positif et non-culpabilisant

Format de réponse STRICTEMENT en JSON :
{
  "victoire_du_jour": {
    "task_id": "uuid de la tâche choisie",
    "titre": "titre de la tâche",
    "raison": "pourquoi c'est important aujourd'hui (1 phrase)"
  },
  "etape_zero": {
    "action": "action concrète de 30 secondes",
    "emoji": "emoji approprié"
  },
  "message_encouragement": "message court et chaleureux",
  "salutation": "Bonjour personnalisé basé sur l'heure"
}`;

export interface MorningBriefing {
  victoire_du_jour: {
    task_id: string;
    titre: string;
    raison: string;
  };
  etape_zero: {
    action: string;
    emoji: string;
  };
  message_encouragement: string;
  salutation: string;
}

export interface TaskForAI {
  id: string;
  text: string;
  priority: string;
  quadrant: number;
  due_date?: string;
  completed: boolean;
}

export async function generateMorningBriefing(
  tasks: TaskForAI[],
  userName?: string
): Promise<MorningBriefing> {
  const hour = new Date().getHours();
  const incompleteTasks = tasks.filter(t => !t.completed);
  
  if (incompleteTasks.length === 0) {
    // No tasks, return a default encouraging message
    return {
      victoire_du_jour: {
        task_id: '',
        titre: 'Créer ta première tâche',
        raison: "C'est le premier pas vers une journée organisée",
      },
      etape_zero: {
        action: "Ouvre l'app et appuie sur le bouton + en bas",
        emoji: '✨',
      },
      message_encouragement: "Chaque grande aventure commence par un petit pas !",
      salutation: hour < 9 ? 'Bonjour tôt-levé ! ☀️' : 'Bonjour ! 🌤️',
    };
  }

  const tasksContext = incompleteTasks.map(t => ({
    id: t.id,
    texte: t.text,
    priorité: t.priority,
    quadrant: t.quadrant,
    date_limite: t.due_date || 'non définie',
  }));

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
          { role: 'system', content: MORNING_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Il est ${hour}h. ${userName ? `L'utilisateur s'appelle ${userName}.` : ''} 
Voici ses tâches en cours : ${JSON.stringify(tasksContext, null, 2)}

Génère la Gazette du Matin.` 
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Parse JSON from response
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(jsonStr) as MorningBriefing;
  } catch (error) {
    console.error('Error generating morning briefing:', error);
    
    // Fallback with first urgent task
    const urgentTask = incompleteTasks.sort((a, b) => a.quadrant - b.quadrant)[0];
    return {
      victoire_du_jour: {
        task_id: urgentTask.id,
        titre: urgentTask.text,
        raison: "C'est ta priorité du moment",
      },
      etape_zero: {
        action: 'Prends 30 secondes pour relire cette tâche',
        emoji: '👀',
      },
      message_encouragement: 'Tu as tout ce qu\'il faut pour réussir !',
      salutation: 'Bonjour ! 🌅',
    };
  }
}

// ============================================
// EVENING REVIEW (21h - 23h)
// ============================================

const EVENING_SYSTEM_PROMPT = `Tu es un compagnon apaisant qui aide à vider l'esprit avant le sommeil.
Ton rôle est de transformer les pensées de l'utilisateur en actions concrètes pour demain.

Règles :
- Sois doux, calme et rassurant
- Transforme les inquiétudes en tâches actionnables
- Célèbre les petites victoires de la journée
- Aide à "fermer les boucles" mentales ouvertes

Format de réponse STRICTEMENT en JSON :
{
  "nouvelles_taches": [
    {"text": "tâche à faire demain", "priority": "low|medium|high", "quadrant": 1-4}
  ],
  "notes_journal": "résumé de ce que l'utilisateur a partagé (pour son journal)",
  "celebration": "ce dont l'utilisateur peut être fier aujourd'hui",
  "message_nuit": "message apaisant pour bien dormir"
}`;

export interface EveningReviewResult {
  nouvelles_taches: Array<{
    text: string;
    priority: 'low' | 'medium' | 'high';
    quadrant: number;
  }>;
  notes_journal: string;
  celebration: string;
  message_nuit: string;
}

export async function generateEveningReview(
  userInput: string,
  completedToday: TaskForAI[]
): Promise<EveningReviewResult> {
  const completedContext = completedToday.map(t => t.text).join(', ');

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
          { role: 'system', content: EVENING_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `L'utilisateur partage ses pensées du soir :
"${userInput}"

Tâches terminées aujourd'hui : ${completedContext || 'aucune'}

Aide-le à fermer sa journée en paix.` 
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Parse JSON
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(jsonStr) as EveningReviewResult;
  } catch (error) {
    console.error('Error generating evening review:', error);
    
    return {
      nouvelles_taches: [],
      notes_journal: userInput,
      celebration: "Tu as fait de ton mieux aujourd'hui, et c'est suffisant.",
      message_nuit: 'Repose-toi bien. Demain est un nouveau jour plein de possibilités. 🌙',
    };
  }
}

// ============================================
// CONVERSATION PROMPTS FOR EVENING
// ============================================

export const EVENING_CONVERSATION_PROMPTS = [
  "Qu'est-ce qui te trotte dans la tête ce soir ? 🌙",
  "De quoi es-tu fier aujourd'hui, même une petite chose ? ✨",
  "Y a-t-il quelque chose que tu ne veux pas oublier pour demain ? 📝",
  "Comment te sens-tu en ce moment ? 💭",
];

export function getRandomEveningPrompt(): string {
  return EVENING_CONVERSATION_PROMPTS[
    Math.floor(Math.random() * EVENING_CONVERSATION_PROMPTS.length)
  ];
}
