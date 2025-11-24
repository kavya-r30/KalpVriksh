"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MessageSquare } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function StudentMessagesPage() {
  const [selectedChat, setSelectedChat] = useState<number | null>(null)

  // Mock messages data
  const chats = [
    {
      id: 1,
      name: "Class Teacher",
      role: "Teacher",
      lastMessage: "Don't forget to submit your assignment",
      time: "10:30 AM",
      unread: 2,
    },
    {
      id: 2,
      name: "Principal Office",
      role: "Admin",
      lastMessage: "School will be closed tomorrow",
      time: "Yesterday",
      unread: 0,
    },
    {
      id: 3,
      name: "Sports Coach",
      role: "Staff",
      lastMessage: "Practice starts at 4 PM",
      time: "Yesterday",
      unread: 0,
    },
  ]

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Messages</h2>
        <p className="text-muted-foreground mt-1">Communicate with teachers and school administration</p>
      </div>

      <Card className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        <div className="border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-8" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={`flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors ${
                    selectedChat === chat.id ? "bg-muted" : ""
                  }`}
                >
                  <Avatar>
                    <AvatarImage src={`/generic-placeholder-graphic.png?height=40&width=40`} />
                    <AvatarFallback>{chat.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{chat.name}</span>
                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{chat.role}</p>
                    <p className="text-sm text-muted-foreground truncate mt-1">{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {chat.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="col-span-2 flex flex-col">
          {selectedChat ? (
            <>
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>CT</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">Class Teacher</h3>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                      <p className="text-sm">Hello Rahul, please submit your math assignment by tomorrow.</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">10:30 AM</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%]">
                      <p className="text-sm">Yes ma'am, I will submit it today.</p>
                      <span className="text-[10px] text-primary-foreground/70 mt-1 block">10:35 AM</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input placeholder="Type a message..." />
                  <Button size="icon">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
