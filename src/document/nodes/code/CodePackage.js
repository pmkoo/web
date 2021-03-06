import Code from 'substance/packages/code/Code'
import CodeHTMLConverter from 'substance/packages/code/CodeHTMLConverter'
import CodeXMLConverter from 'substance/packages/code/CodeXMLConverter'
import AnnotationComponent from 'substance/ui/AnnotationComponent'
import CodeMarkdownComponent from './CodeMarkdownComponent'
import AnnotationCommand from 'substance/ui/AnnotationCommand'
import AnnotationTool from 'substance/ui/AnnotationTool'
import CodeMacro from './CodeMacro'

export default {
  name: 'code',
  configure: function (config) {
    config.addNode(Code)
    config.addConverter('html', CodeHTMLConverter)
    config.addConverter('xml', CodeXMLConverter)
    config.addComponent('code', AnnotationComponent)
    config.addComponent('code-markdown', CodeMarkdownComponent)
    config.addCommand('code', AnnotationCommand, { nodeType: Code.type })
    config.addTool('code', AnnotationTool)
    config.addMacro(new CodeMacro())
    config.addIcon('code', { 'fontawesome': 'fa-code' })
    config.addLabel('code', {
      en: 'Code',
      de: 'Code'
    })
  }
}
