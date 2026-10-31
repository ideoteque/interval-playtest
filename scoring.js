// Pontuação original da v0.3, sem alteração dos valores ou condições.
export function intervalScore(grid,rules=3,final=true){
  const advanced=rules>=2,tuned=rules>=3,horizontal=[],vertical=[],lines=[],columns=[];
  for(let i=0;i<12;i++)if(grid[i]){
   if(i%4<3&&grid[i+1]&&grid[i].k===grid[i+1].k)horizontal.push([i,i+1]);
   if(i<8&&grid[i+4]&&grid[i].k===grid[i+4].k)vertical.push([i,i+4]);
  }
  const contactValue=edge=>advanced&&grid[edge[0]].k===4?2:1;
  function line(cards,index,verticalAxis){const complete=cards.every(Boolean),ascending=complete&&cards.every((c,i)=>!i||c.v>cards[i-1].v),descending=complete&&cards.every((c,i)=>!i||c.v<cards[i-1].v),sameSymbol=complete&&cards.every(c=>c.k===cards[0].k),direction=verticalAxis&&tuned?-1:1,consecutive=complete&&cards.every((c,i)=>!i||c.v===cards[i-1].v+direction);return {r:index,cards,complete,ascending,descending,sameSymbol,consecutive,points:verticalAxis?(tuned&&descending?1:0):(ascending?3:0),symbolPoints:advanced&&sameSymbol?(verticalAxis?2:3):0,sequencePotential:advanced&&consecutive?(verticalAxis?4:8):0};}
  for(let r=0;r<3;r++)lines.push(line(grid.slice(r*4,r*4+4),r,false));
  for(let c=0;c<4;c++)columns.push(line([grid[c],grid[c+4],grid[c+8]],c,true));
  const horizontalPoints=horizontal.reduce((n,e)=>n+contactValue(e),0),verticalPoints=vertical.reduce((n,e)=>n+contactValue(e),0),contacts=horizontalPoints+verticalPoints,rows=lines.reduce((n,l)=>n+l.points,0),descendingCols=columns.reduce((n,l)=>n+l.points,0),symbolRows=lines.reduce((n,l)=>n+l.symbolPoints,0),symbolCols=columns.reduce((n,l)=>n+l.symbolPoints,0),perfectRows=lines.reduce((n,l)=>n+l.sequencePotential,0),perfectCols=columns.reduce((n,l)=>n+l.sequencePotential,0),finalBonusPotential=perfectRows+perfectCols,finalBonus=final?finalBonusPotential:0,baseTotal=contacts+rows+descendingCols+symbolRows+symbolCols;
  return {contacts,rows,descendingCols,symbolRows,symbolCols,horizontalPoints,verticalPoints,horizontal,vertical,lines,columns,perfectRows,perfectCols,finalBonusPotential,finalBonus,baseTotal,total:baseTotal+finalBonus};
 }
