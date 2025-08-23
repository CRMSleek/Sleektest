"use client"

import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface ChartData {
  responses?: Array<{ date: string; count: number }>
  customerGrowth?: Array<{ date: string; count: number }>
  ageDemographics?: Array<{ age: number; count: number }>
  locationDistribution?: Array<{ location: string; count: number }>
  satisfaction?: Array<{ date: string; rating: number }>
}

interface AnalyticsChartProps {
  type: "responses" | "growth" | "age" | "location" | "satisfaction"
}

export function AnalyticsChart({ type }: AnalyticsChartProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setIsMounted(true)
    fetchChartData()
  }, [type])

  const fetchChartData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analytics', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const analyticsData = await response.json()
        
        let chartData: any[] = []
        
        switch (type) {
          case "responses":
            chartData = analyticsData.responseTrends || []
            break
          case "growth":
            chartData = analyticsData.customerGrowth || []
            break
          case "age":
            chartData = analyticsData.ageDemographics || []
            break
          case "location":
            chartData = analyticsData.locationDistribution || []
            break
          case "satisfaction":
            chartData = analyticsData.satisfactionTrends || []
            break
        }
        
        setData(chartData)
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error)
      // Fallback to empty data
      setData([])
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) {
    return <div className="h-[300px] flex items-center justify-center">Loading chart...</div>
  }

  if (loading) {
    return <div className="h-[300px] flex items-center justify-center">Loading chart data...</div>
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No data available for this chart
      </div>
    )
  }
 
  if (type === "location") {
    // Generate colors for location chart
    const colors = ["#2563eb", "#7c3aed", "#dc2626", "#ea580c", "#16a34a", "#0891b2"]
    
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="count"
              label={({ location, count }) => `${location} (${count})`}
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === "age") {
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="age" 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              formatter={(value: number) => [value, 'Customers']}
              labelFormatter={(label) => `Age: ${label}`}
            />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === "satisfaction") {
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis 
              dataKey="date" 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => {
                const date = new Date(value)
                const now = new Date()
                const diffTime = Math.abs(now.getTime() - date.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                
                if (diffDays <= 7) {
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                } else if (diffDays <= 30) {
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                } else {
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                }
              }}
            />
            <YAxis 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              domain={[0, 5]}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: number) => [value.toFixed(1), 'Rating']}
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="#16a34a"
              strokeWidth={3}
              activeDot={{ r: 6 }}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis 
            dataKey="date" 
            stroke="#888888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => {
              const date = new Date(value)
              const now = new Date()
              const diffTime = Math.abs(now.getTime() - date.getTime())
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              
              if (diffDays <= 7) {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              } else if (diffDays <= 30) {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              } else {
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
              }
            }}
          />
          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
            formatter={(value: number) => [value, type === "responses" ? 'Responses' : 'Customers']}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#2563eb"
            strokeWidth={2}
            activeDot={{ r: 6 }}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

