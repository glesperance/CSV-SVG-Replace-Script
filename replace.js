#!/usr/local/bin/node
var fs        = require('fs')
  , async     = require('async')
  , _         = require('underscore')
  , libxmljs  = require('libxmljs')
  , path      = require('path')

var argv = Array.prototype.slice.call(process.argv, 2)

if (argv.length < 2) {
  console.log([
      'USAGE: node replace.js [input CSV File] [output directory]'
  ].join('\n'))

  process.exit(-1)
}

// Extract the interesting arguments from argv.
var inputCSVFile    = argv[0]
  , outputDirectory = argv[1]

// Read the CSV File Content.
async.waterfall(function (callback) {
  fs.readFile(inputCSVFile, 'utf8', callback)
})

// Split the CSV file buffer in lines.
// Also, trim them.
.waterfall(function (csvFileBuffer, callback) {
  var lines = csvFileBuffer.split('\n')
  lines = lines.map(function (line) { return line.trim() })
  callback(null, lines)
})

// Cycle Over each Line.
// and extract the info from the CSV and pass it to `replaceNameInSVG`.
.waterfall(function (csvLines, callback) {
  async.eachSeries(csvLines, function (line, callback) {

    // If the line is empty ==> ignore it.
    if (!line) return callback(null)

    var splitLine   = line.split(',')
      , svgFilename = splitLine[0]
      , name        = splitLine[1]

    replaceNameInSVG(svgFilename, name, function (err) {
      // If there is an error, log it but continue..
      if (err)
        console.log(('!!! Conversion error | SVG File Name: "' + svgFilename + '" | Name: "' + name + '" | Error: ' + (err.message || err)).trim())
      callback(null)
    })

  }, callback)
})

.exec(function (err) {
  if (err) 
    console.log('xxx ERROR:', err)
  else 
    console.log('--- ALL DONE.')
})

// ---------------------------------------------------------------------------

function replaceNameInSVG(svgFilename, name, callback) {

  // Read the content of the SVG file
  async.waterfall(function (callback) {
    fs.readFile('./svg/' + svgFilename, 'utf8', callback)
  })

  // Parse and modify the "text" node under `tspan`
  .waterfall(function (svgContent, callback) {
    var err
    try {
      var xmlDoc    = libxmljs.parseXmlString(svgContent)
    } catch (_err) { err = _err }

    // If there was a parsing error
    // ==> Abort, returning the error.
    if (err) return callback(err)

    // Get the tspan node
    // then get its text child
    var tspanNode = xmlDoc.get("//*[contains(local-name(), 'tspan')]")
    var textNode  = tspanNode.child(0)

    // Set the text of the "text" node to `name`
    textNode.text(name)

    // Callback with the modified xmlDoc content
    callback(null, xmlDoc.toString())
  })

  // Write the modified xmlDoc to disk
  .waterfall(function (modifiedSvgContent, callback) {
    var outputFile = path.join(outputDirectory, svgFilename)
    fs.writeFile(outputFile, modifiedSvgContent, callback)
  })

  .exec(callback)
}