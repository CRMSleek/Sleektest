"use client"
import React, { useState, useEffect } from "react"
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper,
    Typography,
    Box
} from "@mui/material"
import { motion } from "framer-motion"
import { useParams } from "next/navigation"

interface Question {
    id: string
    question: string
    type: string
    required: boolean
    options?: string[]
}

export default function SurveyResponsesPage() {
    const params = useParams()
    const [data, setData] = useState<any>({ response: [] })
    const [surveyQuestions, setSurveyQuestions] = useState<Question[]>([])
    const [questionColumns, setQuestionColumns] = useState<string[]>([])

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6 } }),
    }
    const fade = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.7 } },
    }

    const fetchSurveyQuestions = async (id: string) => {
        try {
            const response = await fetch(`/api/surveys/${id}`)
            if (response.ok) {
                const surveyData = await response.json()
                if (surveyData.survey && surveyData.survey.questions) {
                    setSurveyQuestions(surveyData.survey.questions)
                    setQuestionColumns(surveyData.survey.questions.map((q: Question) => q.id))
                }
            }
        } catch (error) {
            console.error("Survey questions fetching error: ", error)
        }
    }

    const fetchData = async (id: string) => {
        try {
            const response = await fetch(`/api/surveys/${id}/responses`)
            if (response.ok) {
                const fetchData = await response.json()
                setData(fetchData)
            }
        } catch (error) {
            console.error("Survey response fetching error: ", error)
        }
    }

    useEffect(() => {
        if (params.id) {
            fetchSurveyQuestions(params.id as string)
            fetchData(params.id as string)
        }
    }, [params.id])

    const getQuestionText = (questionId: string) => {
        const question = surveyQuestions.find(q => q.id === questionId)
        return question ? question.question : questionId
    }

    const formatAnswer = (answer: any) => {
        if (!answer) return "N/A"
        return answer.value
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <motion.div initial="hidden" animate="visible" variants={fade} className="flex-shrink-0 p-6">
                <h1 className="text-3xl font-bold mb-2">Survey Responses</h1>
                <h2 className="text-xl font-bold">{data.response?.length || 0} total responses</h2>
            </motion.div>
            <div className="flex-1 p-6 space-y-6">
                {data.response && data.response.length > 0 && surveyQuestions.length > 0 ? (
                    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="">
                        <TableContainer component={Paper} elevation={0} sx={{ maxWidth: '100%', overflowX: 'auto', backgroundColor: 'transparent' }}>
                            <Table sx={{ width: `${(questionColumns.length + 3) * 200}px`, border: '1px solid white', borderRadius: '8px', overflow: 'hidden' }} aria-label="survey responses table">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.01)', '& th': { borderBottom: '1px solid white', borderRight: '1px solid rgba(255, 255, 255, 0.3)', '&:last-child': { borderRight: 'none' } } }}>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '200px', minWidth: '200px', maxWidth: '200px', textAlign: 'center', padding: '16px 8px' }}>Customer Name</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '200px', minWidth: '200px', maxWidth: '200px', textAlign: 'center', padding: '16px 8px' }}>Email</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '200px', minWidth: '200px', maxWidth: '200px', textAlign: 'center', padding: '16px 8px' }}>Submitted At</TableCell>
                                        {questionColumns.map((questionId) => (
                                            <TableCell key={questionId} sx={{ color: 'white', fontWeight: 'bold', width: '200px', minWidth: '200px', maxWidth: '200px', textAlign: 'center', padding: '16px 8px' }}>
                                                {getQuestionText(questionId)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.response.map((response: any, index: number) => (
                                        <TableRow key={response.id || index} sx={{ backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)', transition: 'background-color 0.2s ease' }, '& td': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)', borderRight: '1px solid rgba(255, 255, 255, 0.2)', '&:last-child': { borderRight: 'none' } } }}>
                                            <TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '200px', textAlign: 'center', padding: '16px 8px', color: 'white' }}>{response.customer_name || 'Anonymous'}</TableCell>
                                            <TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '200px', textAlign: 'center', padding: '16px 8px', color: 'white' }}>{response.customer_email || 'N/A'}</TableCell>
                                            <TableCell sx={{ width: '200px', minWidth: '200px', maxWidth: '200px', textAlign: 'center', padding: '16px 8px', color: 'white' }}>{formatDate(response.submitted_at)}</TableCell>
                                            {questionColumns.map((questionId) => (
                                                <TableCell key={questionId} sx={{ width: '200px', minWidth: '200px', maxWidth: '200px', textAlign: 'center', padding: '16px 8px', color: 'white', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                                    {formatAnswer(response.answers?.[questionId])}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </motion.div>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="h6">
                            {surveyQuestions.length === 0 ? 'Loading survey questions...' : 'No responses yet'}
                        </Typography>
                        <Typography variant="body2">
                            {surveyQuestions.length === 0 
                                ? 'Please wait while we load the survey details.'
                                : 'Survey responses will appear here once customers start filling out the survey.'
                            }
                        </Typography>
                    </Box>
                )}
            </div>
        </div>
    )
}