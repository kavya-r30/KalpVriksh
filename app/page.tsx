"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRole } from "@/contexts/role-context"
import { Button } from "@/components/ui/button"
import { NLSelect } from "@/components/nl-select"
import { getSupabaseClient } from "@/lib/supabase"
import {
  GraduationCap,
  Users,
  School,
  BookOpen,
  UserCircle,
  Shield,
  Clock,
  MessageSquare,
  BarChart3,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Award,
  WandSparkles
} from "lucide-react"
import type { UserRole } from "@/lib/types/database"
import Image from "next/image"

export default function HomePage() {
  const router = useRouter()
  const { setRole, setUserId } = useRole()
  const [selectedRole, setSelectedRole] = useState("any")
  const [selectedUser, setSelectedUser] = useState("any")
  const [loading, setLoading] = useState(false)
  const [userOptions, setUserOptions] = useState<any[]>([{ value: "any", label: "any" }])

  const roleOptions = [
    { value: "any", label: "any" },
    { value: "admin", label: "Administrator" },
    { value: "principal", label: "Principal" },
    { value: "teacher", label: "Teacher" },
    { value: "student", label: "Student" },
    { value: "parent", label: "Parent" },
  ]

  useEffect(() => {
    async function fetchUsers() {
      if (!selectedRole || selectedRole === "any") {
        setUserOptions([{ value: "any", label: "any" }])
        return
      }

      setLoading(true)
      const supabase = getSupabaseClient()
      try {
        if (selectedRole === "admin" || selectedRole === "principal") {
          const { data } = await supabase.from("users").select("*").eq("role", selectedRole).eq("is_active", true)

          const mapped =
            data?.map((u) => ({
              value: u.id,
              label: u.email,
            })) || []

          setUserOptions([{ value: "any", label: "any" }, ...mapped])
        }
        else if (selectedRole === "teacher") {
          const { data } = await supabase
            .from("staff")
            .select("id, first_name, last_name, staff_code, user_id, school:schools(name)")

          const mapped =
            data?.map((t) => ({
              value: t.user_id || t.id,
              label: `${t.first_name} ${t.last_name}`,
            })) || []

          setUserOptions([{ value: "any", label: "any" }, ...mapped])
        }
        else if (selectedRole === "student") {
          const { data } = await supabase
            .from("students")
            .select(
              "id, first_name, last_name, admission_number, user_id, school:schools(name), current_class:classes(name)"
            )
            .limit(50)

          const mapped =
            data?.map((s) => ({
              value: s.user_id || s.id,
              label: `${s.first_name} ${s.last_name}`,
            })) || []

          setUserOptions([{ value: "any", label: "any" }, ...mapped])
        }
        else if (selectedRole === "parent") {
          const { data } = await supabase
            .from("parents")
            .select("id, first_name, last_name, user_id")
            .limit(50)

          const mapped =
            data?.map((p) => ({
              value: p.user_id || p.id,
              label: `${p.first_name} ${p.last_name}`,
            })) || []

          setUserOptions([{ value: "any", label: "any" }, ...mapped])
        }
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [selectedRole])

  const handleContinue = () => {
    if (selectedRole !== "any" && selectedUser !== "any") {
      setRole(selectedRole as UserRole)
      setUserId(selectedUser)
      router.push(`/${selectedRole}`)
    }
  }

  const features = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Student Management",
      description: "Comprehensive student records, enrollment tracking, and performance monitoring in one place.",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Attendance Tracking",
      description: "Real-time attendance monitoring with automated notifications and detailed reports.",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Performance Analytics",
      description: "Detailed insights into student performance with visual dashboards and trend analysis.",
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Communication Hub",
      description: "Seamless messaging between teachers, parents, and students with announcement features.",
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Exam Management",
      description: "Complete exam scheduling, marks entry, and report card generation system.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure & Compliant",
      description: "Role-based access control ensuring data security and complete privacy compliance.",
    },
  ]

  const faqs = [
    {
      question: "What roles are available in the system?",
      answer:
        "The system supports five distinct roles: Administrator (manages all schools and system-wide settings), Principal (oversees individual school operations and staff), Teacher (manages classes, attendance, and grades), Student (views grades, attendance, and assignments), and Parent (monitors child progress and communicates with teachers).",
    },
    {
      question: "How do I access my dashboard?",
      answer:
        "Simply select your role from the dropdown above, then choose your name from the user list. Click 'Continue to Dashboard' to access your personalized dashboard with all the features relevant to your role.",
    },
    {
      question: "Can parents track multiple children?",
      answer:
        "Yes, parents can link multiple children to their account and easily switch between them to view individual progress, attendance records, exam results, and direct communication from their respective teachers.",
    },
    {
      question: "Is the data secure and private?",
      answer:
        "Absolutely. We implement industry-standard encryption, role-based access control, regular security audits, and strict data privacy policies to ensure all student and school data remains protected and compliant with regulations.",
    },
    {
      question: "What features do teachers have access to?",
      answer:
        "Teachers can manage their classes, mark attendance, enter exam marks, create assignments, communicate with parents, view student profiles, and generate performance reports for their assigned classes.",
    },
    {
      question: "How does the attendance system work?",
      answer:
        "Teachers can mark attendance for their classes with just a few clicks. The system automatically notifies parents of absences and generates detailed attendance reports for administrators and principals.",
    },
  ]

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/5 via-background to-accent/5">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-linear(to_right,#8080800a_1px,transparent_1px),linear-linear(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-20">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center justify-center p-2 rounded-full mb-4 animate-fade-in">
              <div className="h-18 w-18 rounded-full flex items-center justify-center shadow-lg shadow-primary/25">
                <Image src={'./favicon.png'} width={10} height={10} alt="Logo" className="w-16" />
              </div>
            </div>
            <div className="space-y-4 animate-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
                <WandSparkles className="h-4 w-4" />
                From Chalkboard To Dashboard
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-balance">
                School Management
                <br />
                <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
                A comprehensive platform designed for government schools to streamline operations, enhance
                communication, and improve student outcomes.
              </p>
            </div>

            <div className="max-w-3xl mx-auto bg-card/80 backdrop-blur-sm rounded-3xl animate-fade-in">
              <div className="text-lg sm:text-xl text-foreground/90 leading-relaxed text-pretty">
                I am a{" "}
                <NLSelect
                  label="role"
                  value={selectedRole}
                  onValueChange={(val) => {
                    setSelectedRole(val)
                    setSelectedUser("any")
                  }}
                  options={roleOptions}
                  empty="No roles found"
                  className="text-lg sm:text-xl font-semibold"
                />{" "}
                and my name is{" "}
                <NLSelect
                  label="user"
                  value={selectedUser}
                  onValueChange={setSelectedUser}
                  options={userOptions}
                  empty={loading ? "Loading users..." : "No users found"}
                  className="text-lg sm:text-xl font-semibold"
                />
                .
              </div>
              <Button
                onClick={handleContinue}
                disabled={selectedRole === "any" || selectedUser === "any" || loading}
                size="lg"
                className="mt-8 w-full sm:w-auto text-base font-medium h-12 px-10 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Continue to Dashboard"
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-muted/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-2">
              <Sparkles className="h-4 w-4" />
              Powerful Features
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools to manage your school efficiently in one integrated platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-14 w-14 bg-linear-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-2">
              <TrendingUp className="h-4 w-4" />
              For Everyone
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Built for Every User</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Customized experiences tailored for administrators, principals, teachers, students, and parents.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { icon: UserCircle, title: "Administrator", desc: "Manage all schools and system settings" },
              { icon: School, title: "Principal", desc: "Oversee school operations and staff" },
              { icon: BookOpen, title: "Teacher", desc: "Manage classes and student progress" },
              { icon: GraduationCap, title: "Student", desc: "View grades and assignments" },
              { icon: Users, title: "Parent", desc: "Monitor child progress" },
            ].map((role, index) => (
              <div
                key={index}
                className="group bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 text-center hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
              >
                <role.icon className="h-12 w-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-semibold text-lg mb-2">{role.title}</h3>
                <p className="text-sm text-muted-foreground">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-muted/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">Everything you need to know about the system.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-lg">
                  <span className="text-pretty pr-4">{faq.question}</span>
                  <ChevronDown className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform shrink-0" />
                </summary>
                <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-border/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>© 2025 School Management System. Built for government schools.</p>
        </div>
      </footer>
    </div>
  )
}
