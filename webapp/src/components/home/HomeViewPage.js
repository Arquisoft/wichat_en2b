import { Bell, BookOpen, ChevronRight, Crown, History, Home, Play, Search, Settings, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function QuizMaster() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>QuizMaster</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link href="#" className="flex items-center gap-1 text-sm font-medium">
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link href="#" className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Crown className="h-4 w-4" />
              Leaderboard
            </Link>
            <Link href="#" className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <History className="h-4 w-4" />
              History
            </Link>
            <Link href="#" className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Profile
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground md:hidden">
              <Search className="h-5 w-5" />
            </Button>
            <Avatar>
              <AvatarImage src="/placeholder.svg" alt="User" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="container py-6 md:py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, John!</h1>
            <p className="text-muted-foreground mt-1">Ready for a new challenge today?</p>
          </div>
          <Button className="w-full md:w-auto" size="lg">
            <Play className="mr-2 h-4 w-4" />
            Play Random Quiz
          </Button>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search for quizzes..." className="pl-9 bg-background border-muted" />
          </div>
        </div>

        <Tabs defaultValue="featured" className="mb-8">
          <TabsList className="grid grid-cols-4 w-full max-w-md mx-auto">
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="featured" className="mt-6">
            <h2 className="text-2xl font-bold mb-6">Featured Quizzes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="overflow-hidden transition-all hover:shadow-md">
                <div className="relative aspect-video">
                  <Image src="/placeholder.svg?height=200&width=400" alt="Science Quiz" fill className="object-cover" />
                  <Badge className="absolute top-3 right-3 bg-primary/90 hover:bg-primary">Science</Badge>
                </div>
                <CardHeader className="pb-2">
                  <h3 className="text-xl font-bold">Science Quiz</h3>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-muted-foreground text-sm">
                    Test your knowledge of scientific principles and discoveries.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <p className="text-sm font-medium">10 questions</p>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Start
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>

              <Card className="overflow-hidden transition-all hover:shadow-md">
                <div className="relative aspect-video">
                  <Image
                    src="/placeholder.svg?height=200&width=400"
                    alt="History Masters"
                    fill
                    className="object-cover"
                  />
                  <Badge className="absolute top-3 right-3 bg-primary/90 hover:bg-primary">History</Badge>
                </div>
                <CardHeader className="pb-2">
                  <h3 className="text-xl font-bold">History Masters</h3>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-muted-foreground text-sm">
                    Journey through time with challenging historical questions.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <p className="text-sm font-medium">15 questions</p>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Start
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>

              <Card className="overflow-hidden transition-all hover:shadow-md">
                <div className="relative aspect-video">
                  <Image
                    src="/placeholder.svg?height=200&width=400"
                    alt="Geography Challenge"
                    fill
                    className="object-cover"
                  />
                  <Badge className="absolute top-3 right-3 bg-primary/90 hover:bg-primary">Geography</Badge>
                </div>
                <CardHeader className="pb-2">
                  <h3 className="text-xl font-bold">Geography Challenge</h3>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-muted-foreground text-sm">Explore countries, capitals, and natural wonders.</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <p className="text-sm font-medium">12 questions</p>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Start
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Your quiz history will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="leaderboard">
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Leaderboard will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Your profile information will appear here</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Popular Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-6 flex flex-col gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <span>Literature</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex flex-col gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <History className="h-5 w-5 text-primary" />
              </div>
              <span>History</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex flex-col gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <span>Sports</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex flex-col gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <span>Science</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

