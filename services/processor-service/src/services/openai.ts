import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import * as logger from './logger';
import { BlogPostData } from '../controllers/messageProcessor';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_SECRET,
});

/**
 * Generate the standard prompt for a new blog post
 * 
 * @param blogPost Blog post data
 * @param additionalContext Additional context to include
 * @returns Formatted prompt
 */
const generateStandardPrompt = (blogPost: BlogPostData, additionalContext: string = ''): string => {
  let prompt = `
Napisz artykuł blogowy w języku polskim zgodnie z poniższymi danymi:

Tytuł: ${blogPost.title}

${blogPost.content ? `Wstępna treść lub notatki: ${blogPost.content}` : ''}
${blogPost.keywords?.length ? `Słowa kluczowe do uwzględnienia: ${blogPost.keywords.join(', ')}` : ''}
${blogPost.focus ? `Kierunek/fokus artykułu: ${blogPost.focus}` : ''}
`;

  // Add standard context for new generation
  if (additionalContext) {
    prompt += `\nDodatkowy kontekst: ${additionalContext}\n`;
  }

  return prompt;
};

/**
 * Generate the regeneration prompt for updating an existing blog post
 * 
 * @param blogPost Blog post data with regeneration information
 * @returns Formatted regeneration prompt
 */
const generateRegenerationPrompt = (blogPost: BlogPostData): string => {
  let prompt = `
Napisz artykuł blogowy w języku polskim zgodnie z poniższymi danymi:

Tytuł: ${blogPost.title}

${blogPost.content ? `Wstępna treść lub notatki: ${blogPost.content}` : ''}
${blogPost.keywords?.length ? `Słowa kluczowe do uwzględnienia: ${blogPost.keywords.join(', ')}` : ''}
${blogPost.focus ? `Kierunek/fokus artykułu: ${blogPost.focus}` : ''}

To jest prośba o REGENERACJĘ istniejącego artykułu. 

${blogPost.feedback ? `Instrukcje dotyczące regeneracji: ${blogPost.feedback}` : ''}

Sekcje do zmiany:
${blogPost.selectedSections?.map(section => `- ${section.subtitle}`).join('\n')}

Poprzednia wersja wygenerowanego artykułu:
${blogPost.previousGeneration?.content}

Proszę ULEPSZYĆ poprzednią wersję, zachowując jej strukturę, ale wprowadzając ulepszenia zgodnie z instrukcjami regeneracji.
`;

  return prompt;
};

/**
 * Generate the output format instructions
 * 
 * @returns Formatted output instructions
 */
const generateOutputFormatInstructions = (): string => {
  return `
Proszę o wygenerowanie dobrze ustrukturyzowanego artykułu zawierającego kilka sekcji z podtytułami. Artykuł powinien być zwrócony w formacie JSON:

  "title": "...",
  "sections": [
    {
      "subtitle": "...",
      "content": "..."
    },
    ...
  ]
Wytyczne dotyczące długości:
- Całkowita liczba znaków artykułu powinna wynosić minimum 4000 znaków.
- Każda sekcja (podtytuł wraz z treścią) powinna zawierać od 500 do 800 znaków.
- Nie skracaj treści – upewnij się, że temat jest szczegółowo omówiony i zawiera wystarczająco dużo przykładów i opisów.
}
`;
};

/**
 * Get the appropriate system prompt based on generation type
 * 
 * @param isRegeneration Whether this is a regeneration request
 * @returns System prompt for OpenAI
 */
const getSystemPrompt = (isRegeneration: boolean): string => {
  if (isRegeneration) {
    return 'Jesteś doświadczonym copywriterem specjalizującym się w ulepszaniu istniejących artykułów blogowych dotyczących architektury wnętrz. Twoja rola polega na poprawie i rozbudowie tekstu zgodnie z przekazanymi instrukcjami regeneracji.\n\n**Wymogi dotyczące długości:**\n- Całkowita liczba znaków artykułu musi wynosić minimum 4000 znaków.\n- Każda sekcja musi zawierać od 500 do 800 znaków.\n- Zachowaj oryginalną strukturę, ale wprowadź ulepszenia zgodne z zasadami SEO, konwersji oraz E-E-A-T (Doświadczenie, Ekspertyza, Autorytet, Wiarygodność).\n\nTwój tekst powinien być angażujący, profesjonalny i zrozumiały dla użytkownika. Odpowiedzi formatuj w strukturze JSON: { "title": "", "sections": [ { "subtitle": "", "content": "" }, ... ] }.';
  } else {
    return 'Jesteś doświadczonym copywriterem specjalizującym się w blogach o architekturze wnętrz. Tworzysz eksperckie, angażujące i dobrze ustrukturyzowane treści w języku polskim, uwzględniające zasady SEO, strategie konwersji oraz E-E-A-T (Doświadczenie, Ekspertyza, Autorytet, Wiarygodność).\n\n**Wymogi dotyczące długości:**\n- Artykuł musi zawierać minimum 4000 znaków.\n- Każda sekcja (podtytuł wraz z treścią) musi zawierać od 500 do 800 znaków.\n- Artykuł powinien zawierać:\n  - Wyraźnie zdefiniowany tytuł i meta opis,\n  - Logiczną strukturę z nagłówkami i podtytułami,\n  - Wplecione kluczowe frazy związane z architekturą wnętrz,\n  - Elementy angażujące czytelnika, takie jak listy, studia przypadku oraz porady,\n  - Wezwania do działania (CTA) zachęcające do kontaktu lub zapoznania się z ofertą.\n\nOdpowiedzi formatuj w strukturze JSON: { "title": "", "sections": [ { "subtitle": "", "content": "" }, ... ] }.';
  }
};

/**
 * Generate content using OpenAI based on the provided blog post data
 * 
 * @param blogPost Original blog post data to base the generation on
 * @param additionalContext Any additional context to include in the prompt
 * @returns The generated content
 */
export const generateContent = async (
  blogPost: BlogPostData,
  additionalContext: string = ''
): Promise<string> => {
  try {
    if (!blogPost.title) {
      blogPost.title = `Generated content ${new Date().toISOString()}`;
      logger.warn(`No title provided, using fallback: "${blogPost.title}"`);
    }
    
    logger.info(`Generating content for post: "${blogPost.title}"`);
    
    const isRegeneration = !!blogPost.previousGeneration;
    let prompt = isRegeneration 
      ? generateRegenerationPrompt(blogPost)
      : generateStandardPrompt(blogPost, additionalContext);
    
    prompt += generateOutputFormatInstructions();

    const systemPrompt = getSystemPrompt(isRegeneration);

    const completion = await openai.responses.create({
      model: "gpt-4.5-preview",
      input: [{
        role: "system",
        content: systemPrompt
      }, {
        role: "user",
        content: prompt
      }],
      text: {
        "format": {
          "type": "text"
        }
      },
      reasoning: {},
      tools: [],
      temperature: 1,
      max_output_tokens: 6000,
      top_p: 1,
      store: true
    });

    const generatedContent = completion.output_text;
    
    if (!generatedContent) {
      logger.error('No content generated by AI');
      throw new Error('No content generated by AI');
    }
    
    logger.info('Content generated successfully');
    return generatedContent;
  } catch (error: any) {
    logger.error('Error generating content:', error);
    throw error;
  }
}; 