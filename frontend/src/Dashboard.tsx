"use client"

import { useState, useEffect, useRef, type FormEvent } from "react"
import { Link, useSearchParams, useLocation } from "react-router-dom"
import dataHandler from "./services/dataHandler"
import firestoreService, { type BlogPost, type GeneratedPost } from "./services/firestoreService"
import { useAuth } from "./contexts/AuthContext"
import { PlusCircle, FileText, Sparkles, ChevronRight, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function Dashboard() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([])
  const [acceptedPosts, setAcceptedPosts] = useState<GeneratedPost[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingPostIds, setPendingPostIds] = useState<string[]>([])
  const [pendingRegenerationIds, setPendingRegenerationIds] = useState<string[]>([])

  // Auth and navigation
  const { currentUser } = useAuth()

  // Form state
  const [title, setTitle] = useState<string>("")
  const [content, setContent] = useState<string>("")
  const [keywordsInput, setKeywordsInput] = useState<string>("")
  const [focus, setFocus] = useState<string>("")
  const [image, setImage] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<string>("accepted")
  
  // Tab change handler
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Track regeneration start times to ensure minimum loading duration
  const regenerationStartTimes = useRef<Record<string, number>>({})
  // Track post content snapshots to detect regeneration completion
  const postContentSnapshots = useRef<Record<string, string>>({})

  // Log user data when navigating to Dashboard
  useEffect(() => {
    if (currentUser) {
      // User logging logic here
    }
  }, [currentUser])

  // Load posts on component mount
  useEffect(() => {
    setLoading(true)
    setError(null)
    
    try {
      // Set up real-time listeners for both collections
      const unsubscribeGenerated = firestoreService.subscribeToGeneratedPosts((posts) => {
        setGeneratedPosts(posts)
        setLoading(false)
      })

      const unsubscribeAccepted = firestoreService.subscribeToAcceptedPosts((posts) => {
        setAcceptedPosts(posts)
        setLoading(false)
      })

      // Clean up subscription on unmount
      return () => {
        unsubscribeGenerated()
        unsubscribeAccepted()
      }
    } catch (err) {
      console.error("Error setting up listeners:", err)
      setError("Failed to connect to database. Please refresh the page.")
      setLoading(false)
    }
  }, []) // Remove dependencies to avoid recreation

  // Remove completed posts from pendingPostIds when generatedPosts updates
  useEffect(() => {
    if (pendingPostIds.length > 0 && generatedPosts.length > 0) {
      const generatedIds = generatedPosts.map(post => post.id || "")
      const updatedPendingIds = pendingPostIds.filter(id => !generatedIds.includes(id))
      
      if (updatedPendingIds.length !== pendingPostIds.length) {
        setPendingPostIds(updatedPendingIds)
      }
    }
  }, [generatedPosts, pendingPostIds])

  // Remove completed regenerations when content actually changes
  useEffect(() => {
    console.log('Checking regeneration completion:', { 
      pendingRegenerationIds, 
      generatedPostsCount: generatedPosts.length 
    })
    if (pendingRegenerationIds.length > 0 && generatedPosts.length > 0) {
      const now = Date.now()
      const minDuration = 3000 // 3 seconds minimum
      
      pendingRegenerationIds.forEach(regenerationId => {
        const currentPost = generatedPosts.find(post => post.id === regenerationId)
        if (currentPost) {
          const currentContent = JSON.stringify(currentPost.sections || [])
          const originalContent = postContentSnapshots.current[regenerationId]
          
          console.log(`Checking content change for ${regenerationId}:`, {
            hasOriginalSnapshot: !!originalContent,
            contentChanged: originalContent && currentContent !== originalContent,
            currentContentLength: currentContent.length,
            originalContentLength: originalContent?.length
          })
          
          // Only complete regeneration if content has actually changed
          if (originalContent && currentContent !== originalContent) {
            const startTime = regenerationStartTimes.current[regenerationId]
            const elapsed = startTime ? now - startTime : minDuration
            const remainingTime = Math.max(0, minDuration - elapsed)
            
            console.log(`Content changed for ${regenerationId}: elapsed=${elapsed}ms, remaining=${remainingTime}ms`)
            
            if (remainingTime > 0) {
              console.log(`Scheduling removal of ${regenerationId} in ${remainingTime}ms`)
              setTimeout(() => {
                console.log(`Removing completed regeneration ${regenerationId} after content change`)
                setPendingRegenerationIds(prev => prev.filter(id => id !== regenerationId))
                delete regenerationStartTimes.current[regenerationId]
                delete postContentSnapshots.current[regenerationId]
              }, remainingTime)
            } else {
              console.log(`Removing completed regeneration ${regenerationId} immediately after content change`)
              setPendingRegenerationIds(prev => prev.filter(id => id !== regenerationId))
              delete regenerationStartTimes.current[regenerationId]
              delete postContentSnapshots.current[regenerationId]
            }
          } else {
            console.log(`Content not yet changed for ${regenerationId}, keeping in pending`)
          }
        }
      })
    }
  }, [generatedPosts, pendingRegenerationIds])

  // Switch to generated tab when there are pending posts or regenerations
  useEffect(() => {
    if (pendingPostIds.length > 0 || pendingRegenerationIds.length > 0) {
      handleTabChange("generated")
    }
  }, [pendingPostIds, pendingRegenerationIds])

  // Stop submitting loader when all pending posts have been generated
  useEffect(() => {
    if (submitting && pendingPostIds.length === 0) {
      setSubmitting(false)
    }
  }, [pendingPostIds, submitting])

  // Clean up pending regeneration IDs after timeout (5 minutes)
  useEffect(() => {
    if (pendingRegenerationIds.length === 0) return
    
    // Remove pending regenerations after 5 minutes
    const timeoutId = setTimeout(() => {
      setPendingRegenerationIds([])
    }, 1 * 60 * 1000)
    
    return () => clearTimeout(timeoutId)
  }, [pendingRegenerationIds])

  // Clean up pending post IDs after timeout (5 minutes)
  useEffect(() => {
    if (pendingPostIds.length === 0) return
    
    // Remove pending posts after 5 minutes
    const timeoutId = setTimeout(() => {
      setPendingPostIds([])
    }, 1 * 60 * 1000)
    
    return () => clearTimeout(timeoutId)
  }, [pendingPostIds])

  // Handle image file selection
  // const _handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
  //   const files = e.target.files
  //   if (files && files.length > 0) {
  //     setImage(files[0])
  //   }
  // }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Only title and keywords are now required
    if (!title || !keywordsInput) {
      setError("Please fill in title and keywords")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Convert comma-separated keywords to array
      const keywords = keywordsInput
        .split(",")
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword !== "")

      const newPost: BlogPost = {
        title,
        content,
        keywords,
        focus,
      }

      // Create post with optional image
      const postId = await dataHandler.createPostWithImage(newPost, image || undefined)
      
      // Add the postId to pending posts
      setPendingPostIds(prev => [...prev, postId])

      // Reset form
      setTitle("")
      setContent("")
      setKeywordsInput("")
      setFocus("")
      setImage(null)

      // Show alert and then switch to generated tab
      alert(`Post generation started successfully! ID: ${postId}`)
      handleTabChange("generated")
      
      // Note: setSubmitting(false) is now handled in the useEffect that watches for generated posts
    } catch (err) {
      console.error("Error creating post:", err)
      setError("Failed to create post. Please try again.")
      setSubmitting(false) // Only set to false on error
    }
  }

  // Handle pending regeneration from navigation state
  useEffect(() => {
    console.log('Navigation state effect triggered:', location.state)
    if (location.state?.pendingRegeneration) {
      const regenerationId = location.state.pendingRegeneration
      console.log('Adding regeneration ID to pending:', regenerationId)
      
      // Record the start time for this regeneration
      regenerationStartTimes.current[regenerationId] = Date.now()
      
      // Capture current post content snapshot to detect changes
      const currentPost = generatedPosts.find(post => post.id === regenerationId)
      if (currentPost) {
        postContentSnapshots.current[regenerationId] = JSON.stringify(currentPost.sections || [])
        console.log('Captured content snapshot for regeneration:', regenerationId)
      }
      
      setPendingRegenerationIds(prev => {
        const updated = prev.includes(regenerationId) ? prev : [...prev, regenerationId]
        console.log('Updated pendingRegenerationIds:', updated)
        return updated
      })
      // Clear the navigation state to prevent re-adding on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state, generatedPosts])

  // Update active tab when URL parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && (tabParam === 'generated' || tabParam === 'accepted')) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">Blog Dashboard</h1>
        <p className="text-lg text-gray-600">Manage your blog content and generated posts</p>
      </header>

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* New Post Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Post</CardTitle>
          <CardDescription>Fill in the details to create a new blog post</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title"
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus" className="text-base">
                Focus
              </Label>
              <Input
                id="focus"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="Main focus of the article (Optional)"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords" className="text-base">
                Keywords <span className="text-red-500">*</span>
              </Label>
              <Input
                id="keywords"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="e.g. technology, web development, react"
                required
                className="h-10"
              />
              <p className="text-sm text-gray-500">Separate keywords with commas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-base">
                Content
              </Label>
              <Textarea
                id="content"
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content here (Optional)"
                className="resize-y min-h-[150px]"
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Generating..." : "Create Post"}
              {!submitting && <PlusCircle className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Posts Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="accepted" className="text-base">
              Accepted Posts ({acceptedPosts.length})
            </TabsTrigger>
            <TabsTrigger value="generated" className="text-base">
              Generated Posts ({generatedPosts.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="accepted" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Accepted Posts
              </CardTitle>
              <CardDescription>Posts that have been reviewed and accepted for publication</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : acceptedPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No accepted posts yet.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {acceptedPosts.map((post) => (
                    <Card
                      key={post.id}
                      className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-300"
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xl line-clamp-2 hover:text-blue-600 cursor-pointer">
                          <Link to={`/accepted-post/${post.id}`}>{post.title}</Link>
                        </CardTitle>
                        {post.acceptedAt && (
                          <CardDescription className="text-xs">
                            Accepted: {new Date(post.acceptedAt.toDate()).toLocaleDateString()}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-2 flex-grow">
                        {post.originalContent && (
                          <p className="text-sm text-gray-700 italic mb-3 line-clamp-2">
                            <span className="font-medium">Original query:</span> "{post.originalContent}"
                          </p>
                        )}

                        {post.sections ? (
                          <p className="text-sm text-gray-600">{post.sections.length} sections</p>
                        ) : post.generatedContent ? (
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {post.generatedContent.substring(0, 100)}...
                          </p>
                        ) : null}
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        {post.status && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                            {post.status}
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/accepted-post/${post.id}`} className="flex items-center text-sm">
                            Read more <ChevronRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generated" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5" />
                Generated Posts
              </CardTitle>
              <CardDescription>AI-generated posts awaiting your review</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : generatedPosts.length === 0 && pendingPostIds.length === 0 && pendingRegenerationIds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No generated posts yet.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Show loading cards for pending posts */}
                  {pendingPostIds.map((id) => (
                    <Card
                      key={`pending-${id}`}
                      className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-300 border border-blue-100"
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="h-5 w-5 rounded-full bg-blue-400 animate-pulse"></div>
                          <CardTitle className="text-xl">Generating post...</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 flex-grow">
                        <div className="animate-pulse space-y-3">
                          <div className="h-2 bg-slate-200 rounded"></div>
                          <div className="h-2 bg-slate-200 rounded"></div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                            <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 animate-pulse">
                          Generating
                        </Badge>
                      </CardFooter>
                    </Card>
                  ))}

                  {/* Show loading cards for pending regenerations */}
                  {pendingRegenerationIds.map((id) => (
                    <Card
                      key={`regenerating-${id}`}
                      className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-300 border border-orange-100"
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="h-5 w-5 rounded-full bg-orange-400 animate-pulse"></div>
                          <CardTitle className="text-xl">Regenerating post...</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 flex-grow">
                        <div className="animate-pulse space-y-3">
                          <div className="h-2 bg-slate-200 rounded"></div>
                          <div className="h-2 bg-slate-200 rounded"></div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                            <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 hover:bg-orange-50 animate-pulse">
                          Regenerating
                        </Badge>
                      </CardFooter>
                    </Card>
                  ))}
                  
                  {/* Actual generated posts */}
                  {generatedPosts.map((post) => (
                    <Card
                      key={post.id}
                      className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-300"
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xl line-clamp-2 hover:text-blue-600 cursor-pointer">
                          <Link to={`/post/${post.id}`}>{post.title}</Link>
                        </CardTitle>
                        {post.generatedAt && (
                          <CardDescription className="text-xs">
                            Generated: {new Date(post.generatedAt).toLocaleDateString()}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-2 flex-grow">
                        {post.originalContent && (
                          <p className="text-sm text-gray-700 italic mb-3 line-clamp-2">
                            <span className="font-medium">Original query:</span> "{post.originalContent}"
                          </p>
                        )}

                        {post.sections ? (
                          <p className="text-sm text-gray-600">{post.sections.length} sections</p>
                        ) : post.generatedContent ? (
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {post.generatedContent.substring(0, 100)}...
                          </p>
                        ) : null}
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        {post.status && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                            {post.status}
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/post/${post.id}`} className="flex items-center text-sm">
                            Review <ChevronRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Dashboard

