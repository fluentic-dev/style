import { getRuntimeDocument } from '../../config/document';
import { setGlobalSheet } from '../../runtime/sheet/global';
import { createDevSheet } from '../../sheet/dev';
import { createNoopSheet } from '../../sheet/utils/noop';

const document = getRuntimeDocument();
setGlobalSheet(document ? createDevSheet({ document }) : createNoopSheet());
