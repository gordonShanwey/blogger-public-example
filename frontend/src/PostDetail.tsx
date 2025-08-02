"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import firestoreService, { type GeneratedPost } from "./services/firestoreService"
import pubSubService from "./services/pubSubService"
import FormattedArticle from "./components/FormattedArticle"
import RawArticle from "./components/RawArticle"
import { ArrowLeft, Edit, RefreshCw, Check, X, AlertCircle, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

function PostDetail() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<GeneratedPost | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("formatted")
  const [accepting, setAccepting] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [deleting, setDeleting] = useState<boolean>(false)

  // Regeneration state
  const [selectedSections, setSelectedSections] = useState<number[]>([])
  const [feedbackMode, setFeedbackMode] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<string>("")
  const [regenerating, setRegenerating] = useState<boolean>(false)

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        setError("Post ID is missing")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const postData = await firestoreService.getGeneratedPostById(postId)

        if (!postData) {
          setError("Post not found")
        } else {
          setPost(postData)
          setError(null)
        }
      } catch (err) {
        console.error("Error fetching post:", err)
        setError("Failed to load post. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId])

  const handleAccept = async () => {
    if (!post) return

    try {
      setAccepting(true)
      await firestoreService.acceptPost(post)
      alert("Post accepted successfully!")
      navigate("/dashboard")
    } catch (err) {
      console.error("Error accepting post:", err)
      setError("Failed to accept post. Please try again later.")
    } finally {
      setAccepting(false)
    }
  }

  const handleSelectSection = (sectionIndex: number) => {
    // Toggle selection
    if (selectedSections.includes(sectionIndex)) {
      setSelectedSections(selectedSections.filter((idx) => idx !== sectionIndex))
    } else {
      setSelectedSections([...selectedSections, sectionIndex])
    }
  }

  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      setError("Please provide feedback about what needs improvement.")
      return
    }

    try {
      setRegenerating(true)

      // Get the selected sections as objects if any are selected
      const sectionsToRegenerate =
        selectedSections.length > 0
          ? selectedSections.map((idx) => {
              if (post?.sections && post.sections[idx]) {
                return {
                  index: idx,
                  subtitle: post.sections[idx].subtitle,
                  content: post.sections[idx].content,
                }
              }
              return { index: idx } // Fallback if section doesn't exist
            })
          : []

      await pubSubService.publishPostRegeneration(
        postId || "",
        sectionsToRegenerate,
        feedback,
        post?.originalContent || "",
      )

      alert("Post has been submitted for regeneration. Check back later to see the updated version.")

      // Reset states
      setSelectedSections([])
      setFeedback("")
      setFeedbackMode(false)

      // Navigate back to posts list
      navigate("/dashboard?tab=generated", { 
        state: { pendingRegeneration: postId } 
      })
    } catch (err) {
      console.error("Error regenerating post:", err)
      setError("Failed to submit post for regeneration. Please try again later.")
    } finally {
      setRegenerating(false)
    }
  }

  const handleCancel = () => {
    setSelectedSections([])
    setFeedback("")
    setFeedbackMode(false)
  }

  const handleSave = async (updatedPost: GeneratedPost) => {
    if (!postId) return

    try {
      setLoading(true)
      await firestoreService.updateGeneratedPost(postId, updatedPost)
      setPost(updatedPost)
      setIsEditing(false)
      setError(null)
    } catch (err) {
      console.error("Error saving post:", err)
      setError("Failed to save changes. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!postId || !post) return

    if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return
    }

    try {
      setDeleting(true)
      await firestoreService.deleteGeneratedPost(postId)
      alert("Post deleted successfully!")
      navigate("/dashboard")
    } catch (err) {
      console.error("Error deleting post:", err)
      setError("Failed to delete post. Please try again later.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex flex-wrap gap-2">
          {post && !feedbackMode && !isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Edit className="h-4 w-4" /> Edit Post
              </Button>

              <Button
                variant="outline"
                onClick={() => setFeedbackMode(true)}
                disabled={regenerating}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Regenerate Post
              </Button>

              <Button
                variant="default"
                onClick={handleAccept}
                disabled={accepting || regenerating}
                className="flex items-center gap-2"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Accepting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Accept Post
                  </>
                )}
              </Button>

              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Delete Post
                  </>
                )}
              </Button>
            </>
          )}

          {isEditing && (
            <Button variant="secondary" onClick={() => setIsEditing(false)} className="flex items-center gap-2">
              <X className="h-4 w-4" /> Cancel Editing
            </Button>
          )}

          {feedbackMode && (
            <>
              <Button variant="secondary" onClick={handleCancel} className="flex items-center gap-2">
                <X className="h-4 w-4" /> Cancel
              </Button>

              <Button
                variant="default"
                onClick={handleRegenerate}
                disabled={regenerating || !feedback}
                className="flex items-center gap-2"
              >
                {regenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Submit for Regeneration
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Feedback form */}
      {feedbackMode && post && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Regeneration Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-700 mb-4 space-y-1">
              <p>1. (Optional) Select specific sections to regenerate by clicking on their headings.</p>
              <p>2. Provide specific feedback about what needs improvement.</p>
            </div>

            <div className="mb-4 space-y-2">
              <label className="block text-blue-800 text-sm font-medium" htmlFor="feedback">
                Your Feedback <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain what needs improvement in the post..."
                className="resize-y min-h-[100px] border-blue-300 focus:border-blue-500"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-800">Selected sections:</span>
              {selectedSections.length === 0 ? (
                <span className="text-sm text-blue-700">None (will regenerate entire post)</span>
              ) : (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {selectedSections.length} section{selectedSections.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
      ) : post ? (
        <Card>
          {/* Tabs Navigation */}
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-0">
              <TabsTrigger value="formatted" className="text-base">
                Formatted Article
              </TabsTrigger>
              <TabsTrigger value="raw" className="text-base">
                Raw Article
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <TabsContent value="formatted" className="mt-0 p-0">
              <CardContent className="p-6 bg-gray-50">
                {post && (
                  <FormattedArticle
                    post={post}
                    onSelectSection={feedbackMode ? handleSelectSection : undefined}
                    selectedSections={selectedSections}
                    onSave={handleSave}
                    isEditing={isEditing}
                  />
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="raw" className="mt-0 p-0">
              <CardContent className="p-6">{post && <RawArticle post={post} />}</CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      ) : (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center justify-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-xl text-gray-700">Post not found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PostDetail

