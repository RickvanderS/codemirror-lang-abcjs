import {parser} from "./syntax.grammar"
import {LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp, foldInside, delimitedIndent} from "@codemirror/language"
import {styleTags, tags as t} from "@lezer/highlight"
import {printTree } from './print-lezer-tree'

export const AbcMusicLanguage = LRLanguage.define({
  parser: parser.configure({
    strict : false,
    props: [
      indentNodeProp.add({
        Application: delimitedIndent({closing: ")", align: false})
      }),
      foldNodeProp.add({
        Application: foldInside
      }),
      styleTags({
		//Fields
		LineFieldInstructionStart   : t.attributeName ,
		LineFieldStringStart        : t.attributeName ,
		LineFieldLyricStart         : t.attributeName ,
		LineFieldUnknownStart       : t.attributeName ,
		LineFieldContinue           : t.attributeName ,
		InlineFieldInstructionStart : t.attributeName ,
		InlineFieldStringStart      : t.attributeName ,
		InlineFieldUnknownStart     : t.attributeName ,
		InlineFieldEnd              : t.attributeName ,
		LineFieldInstructionValue   : t.regexp        ,
		InlineFieldInstructionValue : t.regexp        ,
		LineFieldStringValue        : t.string        ,
		InlineFieldStringValue      : t.string        ,
		LineFieldUnknownValue       : t.attributeValue,
		InlineFieldUnknownValue     : t.attributeValue,
		LyricSyllable               : t.unit          ,
		LyricBreak                  : t.punctuation   ,
		LyricSkip                   : t.punctuation   ,
		LyricBar                    : t.separator     ,
		
		//Comments
		EolCommentStart        : t.lineComment,
		EolCommentValue        : t.comment    ,
		LineCommentStart       : t.lineComment,
		LineCommentValue       : t.comment    ,
		LinePseudoCommentStart : t.docComment ,
		LinePseudoCommentValue : t.docString  ,
		
		//Music odd/even
		MusicOdd : t.character,
		MusicEven: t.literal  ,
		
		//Music other
		AccomChord  : t.quote        ,
		BarSep      : t.separator    ,
		BrokenRythm : t.logicOperator,
		Decoration  : t.modifier     ,
		GraceNote   : t.brace        ,
		Slur        : t.paren        ,
		Symbol      : t.macroName    ,
		Tie         : t.operator     ,
		Tuplets     : t.logicOperator,
		
		//Music special
		Gap      : t.inserted,
		NextLine : t.escape  ,
      })
    ]
  }),
  languageData: {
    commentTokens: {line: ";"}
  }
})

export function abcMusic() {
  return new LanguageSupport(AbcMusicLanguage)
}

/**
 * Dump produced tree grammar
 */
export function dumpTree( source : string ) {
  let newParser = AbcMusicLanguage.parser.configure({strict:false})
  let tree = newParser.parse(source)
  let curCursor = tree.cursor()
  console.log(curCursor.toString())
  return printTree(tree,source)
}