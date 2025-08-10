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

const mockData = {
  responses: [
    { month: "Jan", responses: 45 },
    { month: "Feb", responses: 52 },
    { month: "Mar", responses: 48 },
    { month: "Apr", responses: 61 },
    { month: "May", responses: 55 },
    { month: "Jun", responses: 67 },
  ],
  growth: [
    { month: "Jan", customers: 12 },
    { month: "Feb", customers: 18 },
    { month: "Mar", customers: 24 },
    { month: "Apr", customers: 27 },
    { month: "May", customers: 32 },
    { month: "Jun", customers: 38 },
  ],
  age: [
    { range: "18-25", count: 23 },
    { range: "26-35", count: 45 },
    { range: "36-45", count: 32 },
    { range: "46-55", count: 18 },
    { range: "55+", count: 10 },
  ],
  location: [
    { name: "New York", value: 35, color: "#2563eb" },
    { name: "Los Angeles", value: 28, color: "#7c3aed" },
    { name: "Chicago", value: 22, color: "#dc2626" },
    { name: "Miami", value: 15, color: "#ea580c" },
  ],
  satisfaction: [
    { month: "Jan", rating: 4.2 },
    { month: "Feb", rating: 4.3 },
    { month: "Mar", rating: 4.1 },
    { month: "Apr", rating: 4.5 },
    { month: "May", rating: 4.4 },
    { month: "Jun", rating: 4.7 },
  ],
}

interface AnalyticsChartProps {
  type: "responses" | "growth" | "age" | "location" | "satisfaction"
}

export function AnalyticsChart({ type }: AnalyticsChartProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="h-[300px] flex items-center justify-center">Loading chart...</div>
  }

  const data = mockData[type]

  if (type === "location") {
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
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
            <XAxis dataKey="range" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={type === "responses" ? "responses" : type === "growth" ? "customers" : "rating"}
            stroke="#2563eb"
            strokeWidth={2}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
