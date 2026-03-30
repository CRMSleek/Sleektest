"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  }
  const fade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.7 } },
  }
  const user = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [taskDone, setTaskDone] = useState("")
  const [appError, setAppError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [businessSettings, setBusinessSettings] = useState({
    name: user?.name || "",
    email: user?.email || "",
    website: "",
    description: "",
    phone: "",
    address: "",
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    surveyResponses: true,
    weeklyReports: false,
    marketingEmails: false,
  })

  const [emailSettings, setEmailSettings] = useState({
    email: "",
    app_password: "",
    useDefaultServers: true,
    smtp_host: "",
    smtp_port: 587,
    smtp_secure: false,
    imap_host: "",
    imap_port: 993,
    imap_secure: true,
  })
  const [emailSettingsLoaded, setEmailSettingsLoaded] = useState(false)


  const handleSaveBusinessSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/business/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(businessSettings),
      })
      if (!response.ok) {
        throw new Error("Failed to save business settings")
      }
      setAppError("")
      setTaskDone("Business settings updated successfully")
    } catch (error) {
      setAppError("Failed to save business settings")
    } finally {
      setIsLoading(false)
    }
  }

  const saveUserPreferences = async (nextTheme?: string) => {
    await fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: nextTheme ?? theme ?? "dark",
        ...notificationSettings,
      }),
    })
  }

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch("/api/user/preferences")
      if (!response.ok) return
      const data = await response.json()
      setNotificationSettings({
        emailNotifications: !!data.emailNotifications,
        surveyResponses: !!data.surveyResponses,
        weeklyReports: !!data.weeklyReports,
        marketingEmails: !!data.marketingEmails,
      })
      if (data.theme && typeof data.theme === "string") {
        setTheme(data.theme)
      }
    } catch {
      // ignore
    }
  }

  const handleSaveNotificationSettings = async () => {
    setIsLoading(true)
    try {
      await saveUserPreferences()
      setAppError("")
      setTaskDone("Preferences saved successfully")
    } catch (error) {
      setAppError("Failed to update notification settings")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBusinessSettings()
    fetchUserPreferences()
  }, [])

  const fetchEmailSettings = async () => {
    try {
      const res = await fetch("/api/email/settings")
      if (!res.ok) return
      const data = await res.json()
      setEmailSettings((prev) => ({
        ...prev,
        email: data.email || "",
        smtp_host: data.smtp_host ?? "",
        smtp_port: data.smtp_port ?? 587,
        smtp_secure: data.smtp_secure ?? false,
        imap_host: data.imap_host ?? "",
        imap_port: data.imap_port ?? 993,
        imap_secure: data.imap_secure ?? true,
        useDefaultServers: !data.smtp_host && !data.imap_host,
      }))
    } catch {
      // ignore
    } finally {
      setEmailSettingsLoaded(true)
    }
  }

  useEffect(() => {
    fetchEmailSettings()
  }, [])

  const handleSaveEmailSettings = async () => {
    if (!emailSettings.email?.trim()) {
      setAppError("Email address is required")
      return
    }
    setIsLoading(true)
    setAppError("")
    try {
      const response = await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailSettings.email.trim(),
          app_password: emailSettings.app_password,
          smtp_host: emailSettings.useDefaultServers ? "" : emailSettings.smtp_host || null,
          smtp_port: emailSettings.useDefaultServers ? null : (emailSettings.smtp_port || 587),
          smtp_secure: emailSettings.smtp_secure,
          imap_host: emailSettings.useDefaultServers ? "" : emailSettings.imap_host || null,
          imap_port: emailSettings.useDefaultServers ? null : (emailSettings.imap_port || 993),
          imap_secure: emailSettings.imap_secure,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setAppError(data.error || "Failed to save email settings")
        return
      }
      setTaskDone("Email settings saved. You can send and receive emails from the Email tab.")
    } catch {
      setAppError("Failed to save email settings")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Ensure email is populated from auth/me as a fallback
    const ensureEmail = async () => {
      try {
        if (!businessSettings.email) {
          const res = await fetch('/api/auth/me')
          if (res.ok) {
            const data = await res.json()
            if (data?.user?.email) {
              setBusinessSettings((prev) => ({ ...prev, email: data.user.email }))
            }
          }
        }
      } catch {}
    }
    ensureEmail()
  }, [])

  const fetchBusinessSettings = async () => {
    try {
      const response = await fetch("/api/business/settings")
      if (!response.ok) {
        throw new Error("Failed to fetch business settings")
      }
      const data = await response.json()
      setBusinessSettings({
        name: data.businessData.name || "",
        email: data.businessData.email || "",
        website: data.businessData.website || "",
        phone: data.businessData.phone || "",
        address: data.businessData.address || "",
        description: data.businessData.description || "",
      })
      console.log("Business settings fetched successfully:", data.businessData)
    } catch (error) {
      console.error("Error fetching business settings:", error)
    }
  }

  const resetPassword = async () => {
    if (currentPassword === "" || newPassword === "") {
      setAppError("Current password and new password are required")
      return
    }
    if (newPassword.length < 8) {
      setAppError("New password must be at least 8 characters long")
      return
    }
    if (newPassword === currentPassword) {
      setAppError("New password must be different from current password")
      return
    }
    if (newPassword !== confirmPassword) {   
      setAppError("New password and confirmation password do not match")
      return
    }
    setAppError("")
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })
      const data = await response.json()
      setTaskDone("Password saved successfully")
      if (!response.ok) {
        setAppError(data.error)
      }
    } catch (error) {
      setAppError("Failed to update password. Internal server error.")
    }
  }

  const handleTabChange = () => {
    setAppError("")
    setTaskDone("")
    setIsLoading(false)
  }

  useEffect(() => {
    if (taskDone) {
      const timer = setTimeout(() => {
        setTaskDone("");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [taskDone]);

  useEffect(() => {
    if (appError) {
      const timer = setTimeout(() => {
        setTaskDone("");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [appError]);

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete account")
      }

      // Logout and redirect
      await user.logout()
      
      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently deleted.",
      })

      router.push("/login")
    } catch (error: any) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fade}
        transition={{ delay: 0, duration: 0.6 }}>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and business preferences</p>
      </motion.div>

      <Tabs defaultValue="business" onValueChange={handleTabChange}>
        <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6 }}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
        </motion.div>

        <TabsContent value="business" className="space-y-6 pt-4">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.12, duration: 0.6 }}>
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Update your business details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name</Label>
                    <Input
                      id="business-name"
                      value={businessSettings.name}
                      placeholder="Enter your business name"
                      onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-email">Email</Label>
                    <Input
                      id="business-email"
                      type="email"
                      placeholder="Enter your email"
                      value={businessSettings.email}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-website">Website</Label>
                    <Input
                      id="business-website"
                      placeholder="Enter your website URL"
                      value={businessSettings.website}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, website: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-phone">Phone</Label>
                    <Input
                      id="business-phone"
                      placeholder="Enter your business phone number"
                      value={businessSettings.phone}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-description">Description</Label>
                  <Textarea
                    id="business-description"
                    placeholder="Enter your business description"
                    rows={3}
                    value={businessSettings.description}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-address">Address</Label>
                  <Textarea
                    id="business-address"
                    placeholder="Enter your business address"
                    rows={2}
                    value={businessSettings.address}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                  />
                </div>
                {appError && <div className="text-red-500 text-sm">{appError}</div>}
                {taskDone && <div className="text-green-500 text-sm">{taskDone}</div>}
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveBusinessSettings} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.24, duration: 0.6 }}>
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Choose your preferred theme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={theme}
                    onValueChange={async (v) => {
                      setTheme(v)
                      try {
                        await saveUserPreferences(v)
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Choose between light mode, dark mode, or follow your system preference.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="email" className="space-y-6 pt-4">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.12, duration: 0.6 }}>
            <Card>
              <CardHeader>
                <CardTitle>Email (SMTP & IMAP)</CardTitle>
                <CardDescription>
                  Configure your email account to send and receive emails from the dashboard. Use an app-specific password (e.g. Gmail App Password), not your regular login password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-address">Email address</Label>
                    <Input
                      id="email-address"
                      type="email"
                      placeholder="you@example.com"
                      value={emailSettings.email}
                      onChange={(e) => setEmailSettings({ ...emailSettings, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app-password">App password</Label>
                    <Input
                      id="app-password"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={emailSettings.app_password}
                      onChange={(e) => setEmailSettings({ ...emailSettings, app_password: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Gmail: use an App Password from your Google account. Leave blank to keep existing.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-default-servers"
                    checked={emailSettings.useDefaultServers}
                    onCheckedChange={(checked) =>
                      setEmailSettings({ ...emailSettings, useDefaultServers: checked })
                    }
                  />
                  <Label htmlFor="use-default-servers">Use default servers (auto-detect from email domain)</Label>
                </div>
                {!emailSettings.useDefaultServers && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>SMTP (sending)</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="smtp.gmail.com"
                          value={emailSettings.smtp_host}
                          onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="587"
                          value={emailSettings.smtp_port || ""}
                          onChange={(e) =>
                            setEmailSettings({ ...emailSettings, smtp_port: e.target.value ? Number(e.target.value) : 587 })
                          }
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={emailSettings.smtp_secure}
                            onCheckedChange={(c) => setEmailSettings({ ...emailSettings, smtp_secure: c })}
                          />
                          <Label className="text-sm">TLS/SSL</Label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>IMAP (receiving)</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="imap.gmail.com"
                          value={emailSettings.imap_host}
                          onChange={(e) => setEmailSettings({ ...emailSettings, imap_host: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="993"
                          value={emailSettings.imap_port || ""}
                          onChange={(e) =>
                            setEmailSettings({ ...emailSettings, imap_port: e.target.value ? Number(e.target.value) : 993 })
                          }
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={emailSettings.imap_secure}
                            onCheckedChange={(c) => setEmailSettings({ ...emailSettings, imap_secure: c })}
                          />
                          <Label className="text-sm">SSL</Label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {appError && <div className="text-red-500 text-sm">{appError}</div>}
                {taskDone && <div className="text-green-500 text-sm">{taskDone}</div>}
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveEmailSettings} disabled={isLoading || !emailSettingsLoaded}>
                  {isLoading ? "Saving..." : "Save email settings"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 pt-4">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.12, duration: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified about important events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Survey Responses</Label>
                  <p className="text-sm text-muted-foreground">Get notified when someone completes a survey</p>
                </div>
                <Switch
                  checked={notificationSettings.surveyResponses}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, surveyResponses: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive weekly analytics reports</p>
                </div>
                <Switch
                  checked={notificationSettings.weeklyReports}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, weeklyReports: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">Receive updates about new features and tips</p>
                </div>
                <Switch
                  checked={notificationSettings.marketingEmails}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, marketingEmails: checked })
                  }
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotificationSettings} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Preferences"}
              </Button>
            </CardFooter>
          </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 pt-4">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.12, duration: 0.6 }}>
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security and password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input 
                  id="current-password" 
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                  id="new-password" 
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input 
                  id="confirm-password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password" />
                </div>
                {appError && <div className="text-red-500 text-sm">{appError}</div>}
                {taskDone && <div className="text-green-500 text-sm">{taskDone}</div>}
              </CardContent>
              <CardFooter>
                <Button onClick={resetPassword}>Update Password</Button>
              </CardFooter>
            </Card>
          </motion.div>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.24, duration: 0.6 }}>
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Delete Account</CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, all of your data including surveys, customers, saved emails, and business information will be permanently removed from our systems.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove all of your data including:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Your user account</li>
                          <li>All surveys you created</li>
                          <li>All customer data</li>
                          <li>All saved emails</li>
                          <li>Your business information</li>
                          <li>All survey responses</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Yes, delete my account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6 pt-4">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.12, duration: 0.6 }}>
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>You are currently on the Free plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Free Plan</p>
                      <p className="text-sm text-muted-foreground">Up to 100 survey responses per month</p>
                    </div>
                    <div className="text-2xl font-bold">$0</div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Plan includes:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Unlimited surveys</li>
                      <li>• Basic analytics</li>
                      <li>• Email support</li>
                      <li>• Up to 100 responses/month</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button>Upgrade Plan</Button>
              </CardFooter>
            </Card>
          </motion.div>
        </TabsContent>
        
      </Tabs>
    </div>
  )
}
