import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DocPage from './components/DocPage'
import './App.css'

const DOC_SECTIONS = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        file: 'getting-started.md',
        description: 'Quick start guide and installation',
        category: 'guide'
    },
    {
        id: 'core-concepts',
        title: 'Core Concepts',
        file: 'core-concepts.md',
        description: 'Understanding WeightedText, Sections, and prompt structure',
        category: 'guide'
    },
    {
        id: 'basic-usage',
        title: 'Basic Usage',
        file: 'basic-usage.md',
        description: 'Creating sections, formatting, and simple examples',
        category: 'guide'
    },
    {
        id: 'advanced-usage',
        title: 'Advanced Usage',
        file: 'advanced-usage.md',
        description: 'Parameters, weights, and complex prompt structures',
        category: 'guide'
    },
    {
        id: 'recipes',
        title: 'Recipes',
        file: 'recipes.md',
        description: 'Revolutionary prompt creation with the new Recipes API',
        category: 'guide'
    },
    {
        id: 'cli-usage',
        title: 'CLI Overview',
        file: 'cli-usage.md',
        description: 'Command Line Interface overview',
        category: 'command'
    },
    {
        id: 'cli-create',
        title: 'create',
        file: 'cli-create.md',
        description: 'Scaffold new prompts',
        category: 'command'
    },
    {
        id: 'cli-process',
        title: 'process',
        file: 'cli-process.md',
        description: 'Format and export prompts',
        category: 'command'
    },
    {
        id: 'cli-execute',
        title: 'execute',
        file: 'cli-execute.md',
        description: 'Run prompts against LLMs',
        category: 'command'
    },
    {
        id: 'template-configuration',
        title: 'Templates',
        file: 'template-configuration.md',
        description: 'Automatic file loading and template configuration',
        category: 'api'
    },
    {
        id: 'parser',
        title: 'Parser',
        file: 'parser.md',
        description: 'Converting Markdown to structured prompts',
        category: 'api'
    },
    {
        id: 'loader',
        title: 'Loader',
        file: 'loader.md',
        description: 'Loading prompts from files and directories',
        category: 'api'
    },
    {
        id: 'override',
        title: 'Overrides',
        file: 'override.md',
        description: 'Customizing prompts with multi-layered overrides',
        category: 'api'
    },
    {
        id: 'builder',
        title: 'Builder',
        file: 'builder.md',
        description: 'Programmatic prompt construction',
        category: 'api'
    },
    {
        id: 'api-reference',
        title: 'API Reference',
        file: 'api-reference.md',
        description: 'Complete API documentation',
        category: 'api'
    },
    {
        id: 'credits',
        title: 'Credits',
        file: 'credits.md',
        description: 'Design credits and acknowledgments'
        // No category means it won't appear in the main nav
    }
];

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout docSections={DOC_SECTIONS} />}>
                    <Route index element={<DocPage docSections={DOC_SECTIONS} />} />
                    <Route path=":slug" element={<DocPage docSections={DOC_SECTIONS} />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
