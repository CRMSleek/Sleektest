import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    // Delete in order to respect foreign key constraints
    // Even though CASCADE is set up, we'll do it explicitly for clarity and to ensure cleanup

    // 1. Delete emails (has user_id foreign key with CASCADE)
    await supabase
      .from('emails')
      .delete()
      .eq('user_id', userId)

    // 2. Get all surveys for this user to delete their responses
    const { data: userSurveys } = await supabase
      .from('surveys')
      .select('id')
      .eq('user_id', userId)

    if (userSurveys && userSurveys.length > 0) {
      const surveyIds = userSurveys.map(s => s.id)
      
      // Delete survey responses (has survey_id foreign key with CASCADE, but we'll do it explicitly)
      // Note: Some responses might have customer_id set to NULL, but we'll delete by survey_id
      await supabase
        .from('survey_responses')
        .delete()
        .in('survey_id', surveyIds)
    }

    // 3. Delete surveys (has user_id foreign key with CASCADE)
    await supabase
      .from('surveys')
      .delete()
      .eq('user_id', userId)

    // 4. Get business ID before deleting it
    const { data: userBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (userBusiness?.id) {
      // 5. Delete customers (has business_id foreign key with CASCADE)
      await supabase
        .from('customers')
        .delete()
        .eq('business_id', userBusiness.id)
      
      // 6. Delete business (has user_id foreign key with CASCADE)
      await supabase
        .from('businesses')
        .delete()
        .eq('user_id', userId)
    } else {
      // If no business found, still try to delete (shouldn't happen normally)
      await supabase
        .from('businesses')
        .delete()
        .eq('user_id', userId)
    }

    // 7. Finally, delete the user account
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (userDeleteError) {
      console.error("Error deleting user:", userDeleteError)
      return NextResponse.json({ error: "Failed to delete user account" }, { status: 500 })
    }

    // Clear the auth cookie
    const response = NextResponse.json({ success: true, message: "Account deleted successfully" })
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    })

    return response
  } catch (err: any) {
    console.error("Error deleting account:", err)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}

