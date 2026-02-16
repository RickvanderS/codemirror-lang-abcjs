import {ExternalTokenizer} from "@lezer/lr"
import {
	LineCommentStart,
	LinePseudoCommentStart,
	LineFieldInstructionStart,
	LineFieldStringStart,
	LineFieldLyricStart,
	LineFieldUnknownStart,
	LineFieldContinue,
	InlineFieldInstructionStart,
	InlineFieldStringStart,
	InlineFieldUnknownStart,
	BarSep
} from "./syntax.grammar.terms"

function IsLineBreak(CharCode) {
	let Char = String.fromCharCode(CharCode);
	return Char == '\n' || CharCode == -1;
}

function IsInvisible(CharCode) {
	let Char = String.fromCharCode(CharCode);
	return Char == ' ' || Char == '\t';
}

function IsComment(CharCode) {
	let Char = String.fromCharCode(CharCode);
	return Char == '%';
}

function IsBarSep(CharCode) {
	let Char = String.fromCharCode(CharCode);
	return Char == ':' || Char == '[' || Char == ']' || Char == '|';
}

function IsBarSepRepeat(CharCode) {
	let Char = String.fromCharCode(CharCode);
	return Char == '[';
}

function IsAlpha(CharCode) {
	let Char = String.fromCharCode(CharCode);
	if ('A' <= Char && Char <= 'Z')
		return true;
	if ('a' <= Char && Char <= 'z')
		return true;
	return false;
}

function IsNumber(CharCode) {
	let Char = String.fromCharCode(CharCode);
	if ('0' <= Char && Char <= '9')
		return true;
	if (Char == '-' || Char == ',')
		return true;
	return false;
}

function IsQuote(CharCode) {
	let Char = String.fromCharCode(CharCode);
	return Char == '"';
}

function IsColon(CharCode) {
	let Char = String.fromCharCode(CharCode);
	return Char == ':';
}

function IsChar(CharCode, CompareChar) {
	let Char = String.fromCharCode(CharCode);
	return Char == CompareChar;
}

function IsField(CharCode, Inline) {
	if (IsAlpha(CharCode))
		return true;
	if (!Inline && IsChar(CharCode, '+'))
		return true;
	return false;
}

function AcceptFieldToken(Input, FieldCharCode, Inline) {
	let Char = String.fromCharCode(FieldCharCode);
	if (Inline) {
		let CharUp = Char.toUpperCase();
		if (('A' <= CharUp && CharUp <= 'H') || ('X' <= CharUp && CharUp <= 'Z'))
			Char = '?';
		else if (CharUp == 'O' || CharUp == 'S' || CharUp == 'T')
			Char = '?';
	}
	
	switch (Char) {
		case 'I':
		case 'K':
		case 'L':
		case 'M':
		case 'm':
		case 'P':
		case 'Q':
		case 's':
		case 'U':
		case 'V':
		case 'X':
			if (!Inline)
				Input.acceptToken(LineFieldInstructionStart);
			else
				Input.acceptToken(InlineFieldInstructionStart);
			return;
		case 'A':
		case 'B':
		case 'C':
		case 'D':
		case 'F':
		case 'G':
		case 'H':
		case 'N':
		case 'O':
		case 'R':
		case 'r':
		case 'S':
		case 'T':
		case 'Z':
			if (!Inline)
				Input.acceptToken(LineFieldStringStart);
			else
				Input.acceptToken(InlineFieldStringStart);
			return;
		case 'W':
		case 'w':
			if (!Inline)
				Input.acceptToken(LineFieldLyricStart);
			else
				Input.acceptToken(InlineFieldUnknownStart);
			return;
		default:
			if (!Inline)
				Input.acceptToken(LineFieldUnknownStart);
			else
				Input.acceptToken(InlineFieldUnknownStart);
			return;
		case '+':
			if (!Inline)
				Input.acceptToken(LineFieldContinue);
			else
				Input.acceptToken(InlineFieldUnknownStart);
			return;
	}
}

export const externalHandler = new ExternalTokenizer((Input, Stack) => {
	//Detect inline field start
	if (IsChar(Input.next, '[')) {
		Input.advance();
		if (IsField(Input.next, true)) {
			Input.advance();
			if (IsColon(Input.next)) {
				let FieldCharCode = Input.peek(-1);
				Input.advance();
				AcceptFieldToken(Input, FieldCharCode, true);
			}
		}
	}
	//If the potential token does not start with a bar separator
	else if (!IsBarSep(Input.next)) {
		//If there was a newline or begin of file before this potential token
		if (IsLineBreak(Input.peek(-1))) {
			if (!IsField(Input.next, false)) {
				//Skip tabs and spaces at the beginning of the line
				while (IsInvisible(Input.next))
					Input.advance();
				
				//If line starts with a percent
				if (IsComment(Input.next)) {
					//Check the second character on the line
					Input.advance();
					
					//If line starts with %%
					if (IsComment(Input.next)) {
						//This is an meta/pseudo/directive comment
						Input.advance();
						Input.acceptToken(LinePseudoCommentStart);
					}
					else {
						//This is a normal comment
						Input.acceptToken(LineCommentStart);
					}
				}
			}
			else {
				//When followed by a :, this is the start of a field line
				Input.advance();
				if (IsColon(Input.next)) {
					let FieldCharCode = Input.peek(-1);
					Input.advance();
					AcceptFieldToken(Input, FieldCharCode, false);
				}
			}
		}
	}
	else {
		//Skip all bar separators
		let StepCount  = 0;
		let LastBarSep = Input.next;
		while (IsBarSep(Input.next)) {
			StepCount++;
			LastBarSep = Input.next;
			Input.advance();
		}
		
		//If separator does not end with an [
		if (!IsBarSepRepeat(LastBarSep)) {
			//Skip number , and - for number repeats
			while (IsNumber(Input.next))
				Input.advance();
			Input.acceptToken(BarSep);
		}
		//Does start with [
		else {
			//If there is a-z or A-Z after the [ it does not belong to the bar separator (it is for chord or inline field)
			if (IsAlpha(Input.next)) {
				//Exclude the [ from the separator, but only add the token if there remains another separator
				if (StepCount > 1)
					Input.acceptToken(BarSep, -1);
			}
			//If number , or - after [
			else if (IsNumber(Input.next)) {
				//Skip number , and - for number repeats
				while (IsNumber(Input.next))
					Input.advance();
				Input.acceptToken(BarSep);
			}
			//If " after [
			else if (IsQuote(Input.next)) {
				//Skip quoted text repeat
				Input.advance();
				while (!IsQuote(Input.next) && Input.next != -1)
					Input.advance();
				Input.advance();
				Input.acceptToken(BarSep);
			}
		}
	}
});
