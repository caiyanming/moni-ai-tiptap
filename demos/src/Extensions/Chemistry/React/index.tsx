import React from 'react'
import { Editor } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { Chemistry, InlineChemical, BlockChemical } from '@tiptap/extension-chemistry'

const ChemistryDemo = () => {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Chemistry.configure({
        katexOptions: {
          trust: true,
          throwOnError: false,
        },
        onClick: (node, pos) => {
          console.log('Chemistry formula clicked:', node.attrs.chemical, 'at position:', pos)
        },
      }),
      // Or use individual extensions:
      // InlineChemical.configure({
      //   katexOptions: { trust: true },
      // }),
      // BlockChemical.configure({
      //   katexOptions: { trust: true, displayMode: true },
      // }),
    ],
    content: `
      <h2>Chemistry Formula Extension Demo</h2>
      
      <p>This extension supports various chemistry syntax using mhchem:</p>
      
      <h3>Inline Chemistry Formulas</h3>
      <p>Water formula: <span data-type="inline-chemical" data-chemical="\\ce{H2O}"></span></p>
      <p>Sulfuric acid: <span data-type="inline-chemical" data-chemical="\\ce{H2SO4}"></span></p>
      <p>Calcium chloride: <span data-type="inline-chemical" data-chemical="\\ce{CaCl2}"></span></p>
      
      <h3>Ion Charges</h3>
      <p>Ammonium ion: <span data-type="inline-chemical" data-chemical="\\ce{NH4+}"></span></p>
      <p>Sulfate ion: <span data-type="inline-chemical" data-chemical="\\ce{SO4^2-}"></span></p>
      
      <h3>Block Chemistry Reactions</h3>
      <div data-type="block-chemical" data-chemical="\\ce{2H2 + O2 -> 2H2O}"></div>
      <div data-type="block-chemical" data-chemical="\\ce{CaCO3 ->[heat] CaO + CO2}"></div>
      <div data-type="block-chemical" data-chemical="\\ce{A + B <=> C + D}"></div>
      
      <h3>State Symbols</h3>
      <div data-type="block-chemical" data-chemical="\\ce{H2O (l) + NaCl (s) -> Na+ (aq) + Cl- (aq) + H2O (l)}"></div>
      
      <h3>Physical Units</h3>
      <p>Temperature: <span data-type="inline-chemical" data-chemical="\\pu{25 °C}"></span></p>
      <p>Energy: <span data-type="inline-chemical" data-chemical="\\pu{123 kJ/mol}"></span></p>
      <p>Pressure: <span data-type="inline-chemical" data-chemical="\\pu{1.5 atm}"></span></p>
      
      <h3>Input Rules Examples</h3>
      <p>Try typing the following to see automatic conversion:</p>
      <ul>
        <li><code>\\ce{H2SO4}</code> - Creates inline chemistry</li>
        <li><code>\\pu{25 °C}</code> - Creates inline units</li>
        <li><code>$$\\ce{A + B -> C}$$</code> - Creates block chemistry</li>
        <li><code>$H2O$</code> - Auto-wrapped with \\ce{}</li>
      </ul>
      
      <h3>Keyboard Shortcuts</h3>
      <ul>
        <li><kbd>Ctrl/Cmd + Shift + C</kbd> - Insert inline chemistry formula</li>
        <li><kbd>Ctrl/Cmd + Shift + Alt + C</kbd> - Insert block chemistry formula</li>
      </ul>
    `,
  })

  const insertSampleFormulas = () => {
    if (!editor) return

    // Insert sample formulas
    editor
      .chain()
      .focus()
      .insertContent('<p>Sample chemistry formulas:</p>')
      .insertInlineChemical({ chemical: '\\ce{H2SO4}' })
      .insertContent(' + ')
      .insertInlineChemical({ chemical: '\\ce{2NaOH}' })
      .insertContent(' → ')
      .insertInlineChemical({ chemical: '\\ce{Na2SO4}' })
      .insertContent(' + ')
      .insertInlineChemical({ chemical: '\\ce{2H2O}' })
      .run()

    // Insert block formula
    editor
      .chain()
      .insertContent('<br>')
      .insertBlockChemical({ 
        chemical: '\\ce{CaCO3 ->[\\Delta] CaO + CO2 ^}' 
      })
      .run()
  }

  const insertPhysicalUnits = () => {
    if (!editor) return

    editor
      .chain()
      .focus()
      .insertContent('<p>Physical conditions: ')
      .insertInlineChemical({ chemical: '\\pu{25 °C}' })
      .insertContent(', ')
      .insertInlineChemical({ chemical: '\\pu{1 atm}' })
      .insertContent(', ')
      .insertInlineChemical({ chemical: '\\pu{-298.15 kJ/mol}' })
      .insertContent('</p>')
      .run()
  }

  return (
    <div className="chemistry-demo">
      <div className="controls" style={{ marginBottom: '1rem' }}>
        <button onClick={insertSampleFormulas} style={{ marginRight: '0.5rem' }}>
          Insert Sample Chemistry
        </button>
        <button onClick={insertPhysicalUnits}>
          Insert Physical Units
        </button>
      </div>
      
      <EditorContent 
        editor={editor} 
        className="chemistry-editor"
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '1rem',
          minHeight: '400px',
        }}
      />
      
      <style>{`
        .chemistry-editor {
          font-family: 'Times New Roman', serif;
        }
        
        .tiptap-chemistry-render {
          font-family: 'KaTeX_Main', 'Times New Roman', serif;
        }
        
        .tiptap-chemistry-render--editable:hover {
          background-color: #f0f8ff;
          cursor: pointer;
          border-radius: 2px;
          padding: 1px 2px;
        }
        
        .block-chemistry {
          text-align: center;
          margin: 1em 0;
          padding: 0.5em;
          background-color: #fafafa;
          border-radius: 4px;
        }
        
        .chemistry-render-error {
          background-color: #fee;
          color: #c33;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
        }
        
        .chemistry-render-success {
          /* Successful render styles */
        }
        
        kbd {
          background-color: #f7f7f7;
          border: 1px solid #ccc;
          border-radius: 3px;
          box-shadow: 0 1px 0 rgba(0,0,0,0.2);
          color: #333;
          display: inline-block;
          font-family: monospace;
          font-size: 0.85em;
          font-weight: bold;
          line-height: 1;
          padding: 2px 4px;
          white-space: nowrap;
        }
      `}</style>
    </div>
  )
}

export default ChemistryDemo