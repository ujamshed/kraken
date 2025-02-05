import Graph from "../components/Graph"
import React, { useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import { Box, Grid, Container, TextField, MenuItem, Card, CardContent, Select, InputLabel, FormControl, ThemeProvider} from "@mui/material";
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { CircularProgress } from "@mui/material";
import { retrieveSVG } from "../common/MoleculeUtils";
import { NGLStage, Component } from "../components/NGL"

import MoleculeDataTable from "../components/MoleculeDataTable";

import { neighborPage } from "../common/MoleculeUtils";

async function molecule(molecule_id, signal) {
   /**
    * Requests general umap or pca data from the backend.
    * @param {number} molecule_id Id of the molecule to search on.
    * @param {AbortSignal} signal Abortsignal object.
    */
      const response =  await fetch(`/api/molecules/${molecule_id}`, {signal: signal})
   
      if (!response.ok) {
         throw new Error('Invalid Molecule Id')
      }
   
      else {
         return await response.json()
      }
}

async function dimensionality(molecule_id, type, components, signal, limit=10) {
   /**
    * Requests general umap or pca data from the backend.
    * @param {number} molecule_id Id of the molecule to search on.
    * @param {string} type Type of dimensionality reduction. Can be one of PCA or UMAP.
    * @param {string} components String of comma separated integers.
    * @param {AbortSignal} signal Abortsignal object.
    * @param {number} limit Limit of the search.
    * @return {json}  The response json.
    */
      let encoded = encodeURIComponent(components);

      const response =  await fetch(`/api/molecules/${molecule_id}/neighbors/?type=${type}&components=${encoded}&skip=0&limit=${limit}`, {signal: signal})
   
      if (!response.ok) {
         throw new Error('Invalid Molecule Id')
      }
   
      else {
         return await response.json()
      }
}

async function identifiers(smiles, signal) {
   /**
    * Requests general umap or pca data from the backend.
    * @param {string} smiles Smiles of the molecule.
    * @param {AbortSignal} signal Abortsignal object.
    * @return {json}  The response json.
    */
      let encoded = encodeURIComponent(smiles);

      const response =  await fetch(`/api/molecules/identifiers/?smiles=${encoded}`, {signal: signal})
   
      if (!response.ok) {
         throw new Error('Invalid Molecule Smiles')
      }
   
      else {
         return await response.json()
      }
}

export default function MoleculeInfo() {
   const params = useParams();
   const [ molData, setMolData ] = useState([]);
   const [ umapNeighborData, setUmapNeighborData ] = useState([]);
   const [ pcaNeighborData, setPcaNeighborData ] = useState([]);
   const [ identifierData, setIdentifierData ] = useState([]);
   const [ neighborData, setNeighborData ] = useState([]);
   const [ components, setComponents ] = useState(["1", "2"]);
   const [ type, setType ] = useState("umap");
   const [ svg, setSvg ] = useState({});
   const [ allConformers, setAllConformers ] = useState([]);
   const [ conformer, setConformer ] = useState("");
   const [ width, setWidth ] = useState(window.innerWidth);

   useEffect(() => {
    function checkMobile() {
      setWidth(window.innerWidth);
    }

    // Set isMobile at the start in case it's not the initial render
    checkMobile();

    window.addEventListener('resize', checkMobile);

    // Cleanup the listener when the component is unmounted
    return () => window.removeEventListener('resize', checkMobile);
  }, []); // Empty array means this effect runs once on mount and cleanup on unmount

   function switchDimensionality(event) {
      setType(event.target.value);
      if (event.target.value === "umap")
      {
         setComponents(["1", "2"]);
         setNeighborData(umapNeighborData);
      }
      else {
         setComponents(["1", "2", "3", "4"]);
         setNeighborData(pcaNeighborData);
      }
   }

   function loadData(signal, molid) {
      /**
       * Main driver function which loads the neighbors for a molecule requested by the user.
       * @param {AbortSignal} signal Abortsignal object.
       */
         const fetchData = async () => {
            const molecule_data = await molecule(molid, signal);
            const umap_neighbor_data = await dimensionality(molid, "umap", ["1", "2"], signal);
            const pca_neighbor_data = await dimensionality(molid, "pca", ["1", "2", "3", "4"], signal);
            const svg_data = await retrieveSVG(molecule_data.smiles, signal);
            const identifier_data = await identifiers(molecule_data.smiles, signal);
            return [ molecule_data, umap_neighbor_data, pca_neighbor_data, svg_data, identifier_data ]
         }

         fetchData()
         .catch( (error) => {
            console.log(error);
         })
         .then( (items )=> {
            setMolData(items[0]);
            setUmapNeighborData(items[1]);
            setPcaNeighborData(items[2]);
            setSvg(items[3]);
            setIdentifierData(items[4][0]);
            // Initial set neighbor data to umap so it appears on load.
            setNeighborData(items[1]);
            // If we have conformers, we can set our states.
            if (items[0].conformers_id.length > 0)
            {
               // Get list of conformers
               setAllConformers(items[0].conformers_id);
               // Set conformer to the first one available.
               setConformer(items[0].conformers_id[0].toString());
            }
      })
   }
   
   // initial load of data
   // and load when search changes. 
   useEffect( ( ) => {
      const controller = new AbortController();
      const signal = controller.signal;

      // setUpdatedParameters(false);
      loadData(signal, params.molid);

      return () => {
      controller.abort();
      }
   },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [ params ]
   );

   return (
      <Container maxWidth="xl">
         <Grid container alignItems="center" justifyContent="center" spacing={2}>
            <Grid item xs={(width > 1366) ? 6 : 12} sx={{mt: 3}}>
            {Object.keys(svg).length > 0 && 
               <Box 
                  display="flex"
                  justifyContent="center"
                  alignItems="center" 
                  width="100%">
                     <img alt='' src={`data:image/svg+xml;utf8,${encodeURIComponent(svg.svg)}`} />
               </Box>}
                  {Object.keys(molData).length > 0 && 
                        <Card>
                           <CardContent>
                           <Typography align='left'> <strong>Smiles:</strong> {molData.smiles} </Typography>
                           <Typography align='left'> <strong>InChI:</strong> {identifierData.InChI} </Typography>
                           <Typography align='left'> <strong>InChIKey:</strong> {identifierData.InChIKey} </Typography>
                           <Typography align='left'> <strong>Molecular Weight:</strong> {molData.molecular_weight.toFixed(2)} </Typography>
                           <Box display="flex" justifyContent="center">
                              <Button variant="contained" sx={{ m: 0.5 }} onClick={() => neighborPage(params.molid)}>View Molecule Neighbors</Button>
                           </Box>
                           </CardContent>
                        </Card>}
            </Grid>
            <Grid item xs={(width > 1366) ? 6 : 12}>
               {Object.keys(molData).length > 0 && <MoleculeDataTable molecule_id={molData.molecule_id} initial_data_type="ml" />}
            </Grid>
            {(width > 768) && allConformers.length > 0 && conformer.length > 0 && <Grid item xs={(width > 1366) ? 6 : 12}>
               <Container>
                  <FormControl fullWidth variant="standard">
                     <InputLabel id="conformer">Conformer</InputLabel>
                     <Select
                     labelId="conformer"
                     id="dimension-outline"
                     value={conformer}
                     style={{width: 125}}
                     MenuProps={{ PaperProps: { sx: { maxHeight: 200 } } }}
                     onChange={ function(event) {setConformer(event.target.value.toString());} }
                     >
                        {allConformers.map((item, index) => (
                           <MenuItem key={index} value={item}>{item}</MenuItem>
                        ))}
                     </Select>
                  </FormControl>
                     <Box display="flex" justifyContent="center" alignItems="center">
                     <NGLStage width="700px" height="600px" >
                        <Component path={"/api/conformers/export/"+ conformer + ".sdf"} />
                     </NGLStage>
                  </Box>
               </Container>
            </Grid>}
            {(width > 768) && <Grid item xs={(width > 1366) && allConformers.length > 0 && conformer.length > 0 ? 6 : 12}>
               {Object.keys(neighborData).length > 0 ? 
               <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center">
                  <TextField
                  select
                  id="dimension-outline"
                  value={type}
                  onChange={event => switchDimensionality(event)}
                  sx={{ mb: 1 }}
                  >
                        <MenuItem value={"umap"}>UMAP</MenuItem>
                        <MenuItem value={"pca"}>PCA</MenuItem>
                  </TextField>
                  <Container sx={{ display: 'flex', height: 600, mb: 10}}>
                     <Graph molData={neighborData} componentArray={components} type={type} neighborSearch={true}></Graph>
                  </Container>
               </Box>
               :
               <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center">
                  <CircularProgress />
               </Box>
               }
            </Grid>
            }
            {Object.keys(molData).length > 0 && (width > 768) && <Grid item xs={12}>
            </Grid>}
         </Grid>
      </Container>
   )
}
