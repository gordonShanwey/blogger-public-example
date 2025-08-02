"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
// Use GeneratedPost temporarily until AcceptedPost is defined in firestoreService
import firestoreService, { type GeneratedPost } from "./services/firestoreService"
import FormattedArticle from "./components/FormattedArticle"
import RawArticle from "./components/RawArticle"
import { ArrowLeft, Trash2, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function AcceptedPostDetail() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  // Use GeneratedPost type temporarily
  const [post, setPost] = useState<GeneratedPost | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("formatted")
  const [deleting, setDeleting] = useState<boolean>(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false)

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        setError("Post ID is missing")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        // Fetch accepted post using a dedicated method (needs implementation in firestoreService)
        const postData = await firestoreService.getAcceptedPostById(postId)

        if (!postData) {
          setError("Accepted post not found")
        } else {
          // Assuming AcceptedPost has title and sections similar to GeneratedPost for display
          // Use GeneratedPost type temporarily
          setPost(postData as GeneratedPost)
          setError(null)
        }
      } catch (err) {
        console.error("Error fetching accepted post:", err)
        setError("Failed to load accepted post. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId])

  // Handle post deletion
  const handleDelete = async () => {
    if (!postId) return

    try {
      setDeleting(true)
      // Call delete method in firestoreService
      await firestoreService.deleteAcceptedPost(postId)
      alert("Post deleted successfully!")
      navigate("/dashboard") // Navigate back after deletion
    } catch (err) {
      console.error("Error deleting post:", err)
      setError("Failed to delete post. Please try again later.")
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex flex-wrap gap-2">
          {post && ( // Only show delete button if post is loaded
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
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
                    // Pass undefined or dummy functions for editing-related props
                    onSelectSection={undefined}
                    selectedSections={[]}
                    onSave={undefined}
                    isEditing={false} // Always false
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
            <p className="text-xl text-gray-700">Accepted post not found</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              {deleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AcceptedPostDetail

