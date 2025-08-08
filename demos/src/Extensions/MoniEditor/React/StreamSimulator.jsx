import React, { useCallback,useState } from 'react'

const StreamSimulator = ({ editor, onStreamOperation, isSimulating, setIsSimulating }) => {
  const [simulationSpeed, setSimulationSpeed] = useState(1000)
  const [operationType, setOperationType] = useState('insert')
  const [customContent, setCustomContent] = useState('')

  const sampleOperations = [
    {
      type: 'insert',
      content:
        '<p data-type="paragraph">🤖 AI generated content: This paragraph was inserted by the stream simulator!</p>',
      description: 'Insert AI generated paragraph',
    },
    {
      type: 'update',
      content: '<p data-type="paragraph">📝 AI updated content: This text has been modified by AI!</p>',
      description: 'Update existing paragraph with AI suggestions',
    },
    {
      type: 'insert',
      content: '<h2 data-type="heading" data-level="2">📚 AI Generated Heading</h2>',
      description: 'Insert AI generated heading',
    },
    {
      type: 'insert',
      content: `
<ul data-type="bulletList">
  <li data-type="listItem"><p>🎯 AI suggested point 1</p></li>
  <li data-type="listItem"><p>🚀 AI suggested point 2</p></li>
  <li data-type="listItem"><p>💡 AI suggested point 3</p></li>
</ul>
      `,
      description: 'Insert AI generated bullet list',
    },
    {
      type: 'insert',
      content:
        '<blockquote data-type="blockquote"><p>💬 "This is an AI generated quote that demonstrates the capabilities of the Block Stream system."</p></blockquote>',
      description: 'Insert AI generated blockquote',
    },
  ]

  const simulateOperation = useCallback(
    operation => {
      if (!editor || isSimulating) {return}

      setIsSimulating(true)

      const simulatedOperation = {
        ...operation,
        id: Date.now(),
        targetId: generateTargetId(),
        timestamp: new Date().toISOString(),
        progress: 0,
      }

      // Simulate AI processing with progress
      const progressInterval = setInterval(() => {
        simulatedOperation.progress += 20

        if (simulatedOperation.progress >= 100) {
          clearInterval(progressInterval)

          // Complete the operation
          setTimeout(() => {
            onStreamOperation(simulatedOperation)
            setIsSimulating(false)
          }, 300)
        }
      }, simulationSpeed / 5)
    },
    [editor, onStreamOperation, isSimulating, setIsSimulating, simulationSpeed],
  )

  const generateTargetId = () => {
    return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const runSingleOperation = operation => {
    simulateOperation(operation)
  }

  const runBatchOperations = useCallback(() => {
    if (!editor || isSimulating) {return}

    setIsSimulating(true)
    let currentIndex = 0

    const runNextOperation = () => {
      if (currentIndex >= sampleOperations.length) {
        setIsSimulating(false)
        return
      }

      const operation = sampleOperations[currentIndex]
      const simulatedOperation = {
        ...operation,
        id: Date.now() + currentIndex,
        targetId: generateTargetId(),
        timestamp: new Date().toISOString(),
        batchIndex: currentIndex + 1,
        batchTotal: sampleOperations.length,
      }

      onStreamOperation(simulatedOperation)
      currentIndex++

      setTimeout(runNextOperation, simulationSpeed)
    }

    runNextOperation()
  }, [editor, onStreamOperation, isSimulating, setIsSimulating, simulationSpeed, sampleOperations])

  const runCustomOperation = useCallback(() => {
    if (!customContent.trim()) {return}

    const customOperation = {
      type: operationType,
      content: customContent,
      description: `Custom ${operationType} operation`,
    }

    simulateOperation(customOperation)
  }, [customContent, operationType, simulateOperation])

  const simulateRealtimeEditing = useCallback(() => {
    if (!editor || isSimulating) {return}

    setIsSimulating(true)

    const editingSequence = [
      {
        type: 'insert',
        content: '<p data-type="paragraph">AI 正在思考...</p>',
        description: 'AI is thinking',
      },
      {
        type: 'update',
        content: '<p data-type="paragraph">AI 正在分析文档内容...</p>',
        description: 'AI is analyzing',
      },
      {
        type: 'update',
        content: '<p data-type="paragraph">基于文档内容，我建议添加以下内容：</p>',
        description: 'AI suggestion',
      },
      {
        type: 'insert',
        content: '<p data-type="paragraph">📝 这是 AI 根据上下文生成的智能建议内容。</p>',
        description: 'AI generated suggestion',
      },
    ]

    let stepIndex = 0
    const runStep = () => {
      if (stepIndex >= editingSequence.length) {
        setIsSimulating(false)
        return
      }

      const step = editingSequence[stepIndex]
      onStreamOperation({
        ...step,
        id: Date.now() + stepIndex,
        targetId: generateTargetId(),
        timestamp: new Date().toISOString(),
        step: stepIndex + 1,
        totalSteps: editingSequence.length,
      })

      stepIndex++
      setTimeout(runStep, simulationSpeed / 2)
    }

    runStep()
  }, [editor, onStreamOperation, isSimulating, setIsSimulating, simulationSpeed])

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-800 mb-2">🔄 Stream Simulator</h3>
        <p className="text-sm text-gray-600">Simulate AI Block Stream operations for testing</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Simulation Controls */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Simulation Speed: {simulationSpeed}ms</label>
          <input
            type="range"
            min="200"
            max="3000"
            step="200"
            value={simulationSpeed}
            onChange={e => setSimulationSpeed(Number(e.target.value))}
            className="w-full"
            disabled={isSimulating}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Fast</span>
            <span>Slow</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={runBatchOperations}
              disabled={isSimulating || !editor}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSimulating ? '⏳ Running...' : '🚀 Run Batch Operations'}
            </button>

            <button
              onClick={simulateRealtimeEditing}
              disabled={isSimulating || !editor}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSimulating ? '⏳ Simulating...' : '✨ Simulate Realtime Editing'}
            </button>
          </div>
        </div>

        {/* Sample Operations */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Operations</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {sampleOperations.map((operation, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{operation.type.toUpperCase()}</div>
                  <div className="text-xs text-gray-600">{operation.description}</div>
                </div>
                <button
                  onClick={() => runSingleOperation(operation)}
                  disabled={isSimulating || !editor}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Operation */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Operation</h4>
          <div className="space-y-2">
            <select
              value={operationType}
              onChange={e => setOperationType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSimulating}
            >
              <option value="insert">Insert</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>

            <textarea
              value={customContent}
              onChange={e => setCustomContent(e.target.value)}
              placeholder="Enter custom HTML content..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="3"
              disabled={isSimulating}
            />

            <button
              onClick={runCustomOperation}
              disabled={isSimulating || !editor || !customContent.trim()}
              className="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-sm font-medium hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSimulating ? '⏳ Running...' : '🎯 Run Custom Operation'}
            </button>
          </div>
        </div>

        {/* Status */}
        {isSimulating && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
              <span className="text-blue-700 font-medium text-sm">AI Stream Simulation in Progress</span>
            </div>
            <p className="text-blue-600 text-xs mt-1">Operations will appear in the pending queue for approval</p>
          </div>
        )}

        {/* Usage Tips */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-700 mb-1">💡 Usage Tips</h5>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Adjust simulation speed to see different pacing effects</li>
            <li>• Use batch operations to test multiple AI operations</li>
            <li>• Try realtime editing to see AI "thinking" process</li>
            <li>• Custom operations allow testing specific HTML content</li>
            <li>• All operations require approval before execution</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default StreamSimulator
