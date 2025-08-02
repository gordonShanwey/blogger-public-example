import { GeneratedPost } from '../services/firestoreService';

interface RawArticleProps {
  post: GeneratedPost;
}

const RawArticle = ({ post }: RawArticleProps) => {
  // If post has sections, render them
  if (post.sections && post.sections.length > 0) {
    return (
      <>
        {post.sections.map((section, index) => (
          <div key={index} className="mb-6">
            <h2 className="text-xl font-bold mb-2">{section.subtitle}</h2>
            <p className="text-gray-700">{section.content}</p>
          </div>
        ))}
      </>
    );
  } 
  // If post has generatedContent (markdown or plain text)
  else if (post.generatedContent) {
    // For simplicity, just render as plain text
    return (
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap">{post.generatedContent}</pre>
      </div>
    );
  }
  // Fallback
  else {
    return <p className="text-gray-700">No content available for this post.</p>;
  }
};

export default RawArticle; 