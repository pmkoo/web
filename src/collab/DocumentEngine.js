import DocumentEngineBase from 'substance/collab/DocumentEngine'
import ObjectOperation from 'substance/model/data/ObjectOperation'
import Err from 'substance/util/SubstanceError'

class DocumentEngine extends DocumentEngineBase {

  constructor (config) {
    super(config)

    this.modelFactory = config.modelFactory
  }

  /**
   * Create a document
   */
  createDocument (args, cb) {
    // If necessary, convert the document content to JSON
    if (args.format && args.format !== 'json') {
      this.modelFactory.importDocument(args.schemaName, args.format, args.content, function (err, content) {
        if (err) return cb(new Err('ConvertError', { message: err }))

        this.createDocument({
          schemaName: args.schemaName,
          documentId: args.documentId,
          format: 'json',
          content: content
        }, cb)
      }.bind(this))
      return
    }

    // We start with version 1 because version 0 is assumed to be empty and
    // is treated specially by Substance `SnapshotEngine`
    var version = 1

    // Create a record in the `DocumentStore`
    this.documentStore.createDocument({
      schemaName: args.schemaName,
      documentId: args.documentId,
      version: version
    }, function (err, documentRecord) {
      if (err) return cb(new Err('CreateError', { message: err }))

      // Create a "no op" change in the `ChangeStore` so that version 1 has
      // one change associated with it
      this.changeStore.addChange({
        documentId: documentRecord.documentId,
        change: {
          ops: [
            {type: ObjectOperation.NOP}
          ]
        }
      }, function (err, version) {
        if (err) return cb(new Err('CreateError', { message: err }))

        // Save a snapshot of the document
        // Necessary because our version 1 of a document actually has stuff in it
        // and we want to use it as the "baseline" when snapshots are requested
        this.snapshotEngine.snapshotStore.saveSnapshot({
          documentId: documentRecord.documentId,
          version: documentRecord.version,
          data: args.content
        }, function (err, snapshot) {
          if (err) return cb(new Err('ShapshotError', { message: err }))

          cb(null, snapshot)
        })
      }.bind(this))
    }.bind(this))
  }

  /**
   * Get a document
   */
  getDocument (args, cb) {
    var format = args.format || 'json'
    this.snapshotEngine.getSnapshot(args, function (err, snapshot) {
      if (format === 'html') {
        this.modelFactory.exportDocument(snapshot.data.schema.name, 'html', snapshot.data, function (err, content) {
          snapshot.data = content
          cb(err, snapshot)
        })
      } else {
        cb(err, snapshot)
      }
    }.bind(this))
  }

  /**
   * List all documentIds
   */
  listDocuments (cb) {
    this.documentStore.listDocuments(cb)
  }
}

export default DocumentEngine
