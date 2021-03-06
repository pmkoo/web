import DocumentServerBase from 'substance/collab/DocumentServer'

/**
 * A custom `DocumentServer` to match our custom `DocumentEngine`.
 * Handles necessary extra endpoint arguments, allows documentIds including forward slashes and adds endpoints.
 *
 * @class      DocumentServer (name)
 * @param      {<type>}  config  The configuration
 */
class DocumentServer extends DocumentServerBase {
  bind (app) {
    // These bindings allow for path to be '/' (the bindings in the base class don't)
    app.post(this.path, this._createDocument.bind(this))
    app.get(this.path, this._listDocuments.bind(this))
    app.get(this.path + '*', this._getDocument.bind(this))
    app.delete(this.path + '*', this._deleteDocument.bind(this))
  }

  /**
   * Method override to deal with extra arguments
   */
  _createDocument (req, res, next) {
    this.engine.createDocument({
      schemaName: req.body.schemaName,
      documentId: req.body.documentId,
      format: req.body.format,
      content: req.body.content
    }, function (err, result) {
      if (err) return next(err)
      res.json(result)
    })
  }

  /**
   * Method override to use path as documentId add format parameter and return a simple 404 if document
   * does not exist instead of returning and printing error
   */
  _getDocument (req, res, next) {
    var documentId = req.path.slice(this.path.length)
    this.engine.getDocument({
      documentId: documentId,
      format: req.query.format || 'json'
    }, function (err, result) {
      if (err) return res.status(404).send()
      res.json(result)
    })
  }

  /**
   * Method to provide a list of documents (useful for debugging)
   */
  _listDocuments (req, res, next) {
    this.engine.listDocuments(function (err, result) {
      if (err) return next(err)
      res.json(result)
    })
  }

  /**
   * Method override to use path as documentId
   */
  _deleteDocument (req, res, next) {
    var documentId = req.path.slice(this.path.length)
    this.engine.deleteDocument(documentId, function (err, result) {
      if (err) return next(err)
      res.json(result)
    })
  }
}

export default DocumentServer
