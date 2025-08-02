"use client"

import { useState } from "react"
import type { GeneratedPost } from "../services/firestoreService"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, MessageSquare } from "lucide-react"

interface FormattedArticleProps {
  post: GeneratedPost
  onSelectSection?: (sectionIndex: number) => void
  selectedSections?: number[]
  onSave?: (updatedPost: GeneratedPost) => void
  isEditing?: boolean
}

const FormattedArticle = ({
  post,
  onSelectSection,
  selectedSections = [],
  onSave,
  isEditing = false,
}: FormattedArticleProps) => {
  const [editedPost, setEditedPost] = useState<GeneratedPost>(post)
  const [editedTitle, setEditedTitle] = useState(post.title)
  const [editedSections, setEditedSections] = useState(post.sections || [])

  const handleSectionChange = (index: number, field: "subtitle" | "content", value: string) => {
    const newSections = [...editedSections]
    newSections[index] = {
      ...newSections[index],
      [field]: value,
    }
    setEditedSections(newSections)
    setEditedPost({ ...editedPost, sections: newSections })
  }

  const handleSave = () => {
    if (onSave) {
      onSave({
        ...editedPost,
        title: editedTitle,
        sections: editedSections,
      })
    }
  }

  // If post has sections, render them in a nicely formatted way
  if (post.sections && post.sections.length > 0) {
    return (
      <article className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          {isEditing ? (
            <Input
              type="text"
              value={editedTitle}
              onChange={(e) => {
                setEditedTitle(e.target.value)
                setEditedPost({ ...editedPost, title: e.target.value })
              }}
              className="text-3xl font-bold mb-4 text-center h-auto py-2 text-gray-800"
            />
          ) : (
            <h1 className="text-4xl font-bold mb-4 text-gray-900 leading-tight tracking-tight">{post.title}</h1>
          )}
          {onSelectSection && (
            <p className="text-sm text-gray-500 italic mt-2">
              Click on section headings to select parts for regeneration
            </p>
          )}
        </header>

        <div className="space-y-10">
          {editedSections.map((section, index) => {
            const isSelected = selectedSections.includes(index)
            return (
              <section
                key={index}
                className={`mb-8 ${isSelected ? "bg-yellow-50 p-6 border border-yellow-200 rounded-lg shadow-sm" : ""}`}
              >
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      type="text"
                      value={section.subtitle}
                      onChange={(e) => handleSectionChange(index, "subtitle", e.target.value)}
                      className="text-2xl font-bold mb-4 h-auto py-2 text-gray-800"
                    />
                    <Textarea
                      value={section.content}
                      onChange={(e) => handleSectionChange(index, "content", e.target.value)}
                      className="w-full min-h-[200px] text-base leading-relaxed resize-y"
                    />
                  </div>
                ) : (
                  <>
                    <h2
                      className={`text-2xl font-bold mb-5 text-gray-800 border-b pb-2 ${
                        onSelectSection ? "cursor-pointer hover:text-blue-600 transition-colors duration-200" : ""
                      }`}
                      onClick={() => onSelectSection && onSelectSection(index)}
                    >
                      {section.subtitle}
                      {isSelected && (
                        <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          Selected for regeneration
                        </Badge>
                      )}
                    </h2>
                    <div className="space-y-4">
                      {section.content
                        .split("\n")
                        .filter((para) => para.trim() !== "")
                        .map((paragraph, idx) => (
                          <p key={idx} className="text-gray-700 leading-relaxed text-lg">
                            {paragraph}
                          </p>
                        ))}
                    </div>
                  </>
                )}
              </section>
            )
          })}
        </div>

        {isEditing && (
          <div className="mt-8 flex justify-end">
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </div>
        )}

        {post.originalContent && (
          <footer className="mt-16 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-700">Original Query</h3>
              </div>
              <p className="italic text-gray-600 text-base">"{post.originalContent}"</p>
            </div>
          </footer>
        )}
      </article>
    )
  }
  // If post has generatedContent (markdown or plain text)
  else if (post.generatedContent) {
    return (
      <article className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 leading-tight tracking-tight">{post.title}</h1>
        </header>

        <div className="article-content prose prose-lg max-w-none">
          {post.generatedContent.split(/\n{2,}/).map((block, blockIndex) => {
            // Check for markdown headers
            if (block.startsWith("# ")) {
              return (
                <h1 key={blockIndex} className="text-3xl font-bold mb-6 mt-10 text-gray-900">
                  {block.substring(2)}
                </h1>
              )
            } else if (block.startsWith("## ")) {
              return (
                <h2 key={blockIndex} className="text-2xl font-bold mb-5 mt-8 text-gray-800 border-b pb-2">
                  {block.substring(3)}
                </h2>
              )
            } else if (block.startsWith("### ")) {
              return (
                <h3 key={blockIndex} className="text-xl font-bold mb-4 mt-6 text-gray-800">
                  {block.substring(4)}
                </h3>
              )
            } else if (block.trim().startsWith("- ") || block.trim().startsWith("* ")) {
              // Handle lists
              const items = block.split("\n").filter((item) => item.trim())
              return (
                <ul key={blockIndex} className="list-disc pl-6 mb-6 space-y-2">
                  {items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-gray-700 text-lg">
                      {item.replace(/^[-*]\s+/, "")}
                    </li>
                  ))}
                </ul>
              )
            } else if (block.trim().match(/^\d+\.\s+/)) {
              // Handle numbered lists
              const items = block.split("\n").filter((item) => item.trim())
              return (
                <ol key={blockIndex} className="list-decimal pl-6 mb-6 space-y-2">
                  {items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-gray-700 text-lg">
                      {item.replace(/^\d+\.\s+/, "")}
                    </li>
                  ))}
                </ol>
              )
            } else if (block.trim()) {
              // Regular paragraphs
              return (
                <p key={blockIndex} className="text-gray-700 leading-relaxed text-lg mb-6">
                  {block}
                </p>
              )
            }

            return null
          })}
        </div>

        {post.originalContent && (
          <footer className="mt-16 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-700">Original Query</h3>
              </div>
              <p className="italic text-gray-600 text-base">"{post.originalContent}"</p>
            </div>
          </footer>
        )}
      </article>
    )
  }
  // Fallback
  else {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <p className="text-xl text-gray-700">No content available for this post.</p>
        </CardContent>
      </Card>
    )
  }
}

export default FormattedArticle

